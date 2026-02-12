const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const AdmZip = require('adm-zip');
const app = express();

// ─────────────────────────────────────────────────────────────
// HELPER: Convert a data-URI (or raw base64) to a Node Buffer
// ─────────────────────────────────────────────────────────────
function base64ToBuffer(dataURI) {
    const base64 = dataURI.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64, 'base64');
}

// ─────────────────────────────────────────────────────────────
// HELPER: Escape special regex characters in a string
// ─────────────────────────────────────────────────────────────
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────
// HELPER: Find the next available rId number in a rels XML
// ─────────────────────────────────────────────────────────────
function getNextRelId(relsXml) {
    const rIds = relsXml.match(/rId(\d+)/g);
    if (rIds) {
        return Math.max(...rIds.map(m => parseInt(m.replace('rId', '')))) + 1;
    }
    return 100;
}

// ─────────────────────────────────────────────────────────────
// CORE: Inject chart images into the Word template.
//
// Matches elements by ALT-TEXT (the "descr" attribute on
// <wp:docPr> inside each <w:drawing> block).
//
// Handles TWO types of elements:
//
//  A) WORD-NATIVE CHARTS  (Insert → Chart)
//     These use <a:graphicData uri="…/chart"> with <c:chart r:id="…"/>.
//     There is NO <a:blip> / r:embed.
//     → We replace the <a:graphic>…</a:graphic> section with a
//       picture-based graphic, preserving the wrapper (wp:inline
//       or wp:anchor), size, and position.
//
//  B) REGULAR PICTURES  (inserted images / pasted screenshots)
//     These use <a:blip r:embed="rIdN"/>.
//     → If the rId is unique, we just update the relationship
//       Target to point to our new PNG.
//     → If multiple images share the same rId, we create a new
//       rId for this specific image so the others are unaffected.
//
// Also searches header*.xml and footer*.xml.
// ─────────────────────────────────────────────────────────────
function injectChartImages(wordBuffer, imageBuffers) {
    try {
        const zip = new PizZip(wordBuffer);

        // --- [Content_Types].xml — make sure PNG is declared ----
        let ctXml = zip.files['[Content_Types].xml'].asText();
        if (!ctXml.includes('image/png')) {
            ctXml = ctXml.replace(
                '</Types>',
                '<Default Extension="png" ContentType="image/png"/></Types>'
            );
            zip.file('[Content_Types].xml', ctXml);
        }

        // --- Collect all XML parts that can contain images ----
        const xmlParts = Object.keys(zip.files).filter(f =>
            f === 'word/document.xml' ||
            /^word\/header\d+\.xml$/.test(f) ||
            /^word\/footer\d+\.xml$/.test(f)
        );

        let injectedCount = 0;
        let docPrCounter = 90000;   // high number to avoid ID collisions

        for (const [tagName, imgBuffer] of Object.entries(imageBuffers)) {
            let matchCount = 0;
            // Regex to match descr="tagName" with optional trailing &#xA; (Word adds newlines)
            const descrPattern = new RegExp(
                `descr="${escapeRegex(tagName)}(&#xA;)*"`
            );

            // New media file for this chart image (shared across all matches)
            const newMediaFile = `media/chart_${tagName}.png`;
            zip.file(`word/${newMediaFile}`, imgBuffer);

            for (const xmlFile of xmlParts) {
                let docXml = zip.files[xmlFile].asText();
                const relsPath = xmlFile.replace('word/', 'word/_rels/') + '.rels';
                if (!zip.files[relsPath]) continue;
                let relsXml = zip.files[relsPath].asText();

                // ── PASS 1: Collect ALL matching drawings ──
                // We gather positions first because modifying docXml
                // mid-scan invalidates regex indices.
                const matches = [];
                const drawingRegex = /<w:drawing>[\s\S]*?<\/w:drawing>/g;
                let dm;
                while ((dm = drawingRegex.exec(docXml)) !== null) {
                    if (descrPattern.test(dm[0])) {
                        matches.push({ index: dm.index, block: dm[0] });
                    }
                }

                if (matches.length === 0) continue;

                // ── PASS 2: Replace from END to START ──
                // Reverse order ensures earlier indices stay valid.
                for (let mi = matches.length - 1; mi >= 0; mi--) {
                    const { index: blockIdx, block } = matches[mi];

                    const isChart = block.includes('drawingml/2006/chart');
                    const embedMatch = /r:embed="(rId\d+)"/.exec(block);

                    const extM = /<wp:extent[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(block);
                    const cx = extM ? extM[1] : '4572000';
                    const cy = extM ? extM[2] : '3200400';

                    // ─────────────────────────────────────
                    // CASE A: WORD-NATIVE CHART
                    // ─────────────────────────────────────
                    if (isChart || !embedMatch) {
                        const newRelId = `rId${getNextRelId(relsXml)}`;
                        relsXml = relsXml.replace(
                            '</Relationships>',
                            `<Relationship Id="${newRelId}" ` +
                            `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
                            `Target="${newMediaFile}"/></Relationships>`
                        );

                        const picGraphic =
                            `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
                                `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
                                    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
                                        `<pic:nvPicPr>` +
                                            `<pic:cNvPr id="0" name="chart_${tagName}.png"/>` +
                                            `<pic:cNvPicPr/>` +
                                        `</pic:nvPicPr>` +
                                        `<pic:blipFill>` +
                                            `<a:blip r:embed="${newRelId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` +
                                            `<a:stretch><a:fillRect/></a:stretch>` +
                                        `</pic:blipFill>` +
                                        `<pic:spPr>` +
                                            `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
                                            `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
                                        `</pic:spPr>` +
                                    `</pic:pic>` +
                                `</a:graphicData>` +
                            `</a:graphic>`;

                        const gStart = block.indexOf('<a:graphic');
                        const gEnd   = block.indexOf('</a:graphic>');
                        if (gStart >= 0 && gEnd >= 0) {
                            const gEndFull = gEnd + '</a:graphic>'.length;
                            let newBlock = block.substring(0, gStart) + picGraphic + block.substring(gEndFull);

                            if (!newBlock.includes('cNvGraphicFramePr')) {
                                newBlock = newBlock.replace(
                                    '<a:graphic',
                                    '<wp:cNvGraphicFramePr>' +
                                        '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>' +
                                    '</wp:cNvGraphicFramePr>' +
                                    '<a:graphic'
                                );
                            }

                            docXml = docXml.substring(0, blockIdx) + newBlock +
                                     docXml.substring(blockIdx + block.length);
                        }

                        injectedCount++;
                        matchCount++;
                        console.log(`  ✅ "${tagName}" → replaced CHART #${mi + 1} with image (${cx}×${cy} EMU, ${newRelId} in ${xmlFile})`);
                        continue;
                    }

                    // ─────────────────────────────────────
                    // CASE B: REGULAR PICTURE
                    // ─────────────────────────────────────
                    const relId = embedMatch[1];
                    const rIdOccurrences = (docXml.match(new RegExp(`r:embed="${relId}"`, 'g')) || []).length;

                    if (rIdOccurrences <= 1) {
                        const relElemRegex = new RegExp(`<Relationship[^>]*\\sId="${relId}"[^>]*/?>`, 'i');
                        const relMatch = relElemRegex.exec(relsXml);
                        if (relMatch) {
                            const tgtMatch = /Target="([^"]+)"/.exec(relMatch[0]);
                            if (tgtMatch) {
                                relsXml = relsXml.replace(`Target="${tgtMatch[1]}"`, `Target="${newMediaFile}"`);
                            }
                        }
                        injectedCount++;
                        matchCount++;
                        console.log(`  ✅ "${tagName}" → retargeted PICTURE #${mi + 1} ${relId} → ${newMediaFile} (${xmlFile})`);
                    } else {
                        const newRelId = `rId${getNextRelId(relsXml)}`;
                        relsXml = relsXml.replace(
                            '</Relationships>',
                            `<Relationship Id="${newRelId}" ` +
                            `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
                            `Target="${newMediaFile}"/></Relationships>`
                        );

                        const updatedBlock = block.replace(`r:embed="${relId}"`, `r:embed="${newRelId}"`);
                        docXml = docXml.substring(0, blockIdx) + updatedBlock +
                                 docXml.substring(blockIdx + block.length);

                        injectedCount++;
                        matchCount++;
                        console.log(`  ✅ "${tagName}" → new rId ${newRelId} for shared PICTURE #${mi + 1} (was ${relId}, ${rIdOccurrences} uses) in ${xmlFile}`);
                    }
                }

                // Write back the modified XML for this file
                zip.file(relsPath, relsXml);
                zip.file(xmlFile, docXml);
            }

            if (matchCount === 0) {
                console.warn(`  ⚠️ No image/chart with alt-text "${tagName}" found — skipping`);
            }
        }

        const out = zip.generate({ type: 'nodebuffer' });
        console.log(`📦 Image injection complete: ${injectedCount}/${Object.keys(imageBuffers).length} images swapped (${(out.length / 1024).toFixed(0)} KB)`);
        return out;

    } catch (err) {
        console.error('❌ injectChartImages failed:', err);
        console.error('Stack:', err.stack);
        return wordBuffer;   // return the text-only doc so nothing is lost
    }
}

app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Read the file ONCE when the server starts
const workbook = xlsx.readFile('./data/Dashboard Data.xlsx'); 
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const cachedData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("Data loaded! Server is now lightning fast.");

// ─────────────────────────────────────────────────────────────
// POST /generate-report
//
// Receives:
//   • text data  ({{tag}} placeholders handled by docxtemplater)
//   • _chartImages  (base64 PNGs — matched by ALT-TEXT on stock
//                     images in the template, then the media
//                     file is swapped in-place)
// ─────────────────────────────────────────────────────────────
app.post('/generate-report', (req, res) => {
    try {
        const data = req.body;

        // --- Separate chart images from text data ---
        const chartImages = data._chartImages || {};
        const textData = { ...data };
        delete textData._chartImages;
        // Strip any stale image keys that might have leaked in
        Object.keys(textData).filter(k => k.includes('_image')).forEach(key => {
            delete textData[key];
        });

        console.log('\n=== Chart images received ===');
        const imageTagNames = Object.keys(chartImages);
        console.log(`📸 ${imageTagNames.length} chart images:`, imageTagNames);

        // --- Convert base64 data-URIs → raw Buffers ---
        const imageBuffers = {};
        for (const [tagName, dataURI] of Object.entries(chartImages)) {
            try {
                const buf = base64ToBuffer(dataURI);
                if (buf && buf.length > 0) {
                    imageBuffers[tagName] = buf;
                    console.log(`  ✅ ${tagName}: ${(buf.length / 1024).toFixed(1)} KB`);
                } else {
                    console.warn(`  ⚠️ ${tagName}: empty buffer — skipping`);
                }
            } catch (convErr) {
                console.error(`  ❌ ${tagName}: base64 conversion failed —`, convErr.message);
            }
        }

        // --- Locate template ---
        let templatePath = path.resolve(__dirname, 'data', 'Group Profile CorporateHRA Scan.docx');
        if (!fs.existsSync(templatePath)) {
            templatePath = path.resolve(__dirname, 'Group Profile CorporateHRA Scan.docx');
        }
        if (!fs.existsSync(templatePath)) {
            console.error(`❌ Template not found`);
            return res.status(500).send("Template file not found.");
        }

        const content = fs.readFileSync(templatePath, 'binary');
        if (content.length < 4 || content.substring(0, 2) !== 'PK') {
            return res.status(500).send("Template file is corrupted (not a valid ZIP/Word file).");
        }

        const zip = new PizZip(content);
        if (!zip.files['word/document.xml']) {
            return res.status(500).send("Template is missing word/document.xml.");
        }

        // ──────────────────────────────────────────────
        // PHASE 1 — Docxtemplater: TEXT-ONLY replacement
        // Uses {{ }} delimiters.  {%...} tags are left as-is.
        // ──────────────────────────────────────────────
        const doc = new Docxtemplater(zip, {
            paragraphLoop: false,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' }
            // NO image module — it corrupts the file with docxtemplater v3.67
        });

        console.log('\n=== Phase 1: Text replacement ===');
        console.log('Text data keys:', Object.keys(textData).slice(0, 10), '...');
        try {
            doc.render(textData);
            console.log('✅ Text rendered successfully');
        } catch (renderError) {
            console.error('❌ Docxtemplater render error:', renderError.message);
            if (renderError.properties?.explanation) {
                console.error('Explanation:', renderError.properties.explanation);
            }
            return res.status(500).send(`Template rendering failed: ${renderError.message}`);
        }

        let buf;
        try {
            buf = doc.getZip().generate({ type: 'nodebuffer' });
            console.log(`✅ Text-only document: ${(buf.length / 1024).toFixed(0)} KB`);
        } catch (genErr) {
            console.error('❌ Failed to generate buffer:', genErr.message);
            return res.status(500).send("Failed to generate Word document.");
        }

        // ──────────────────────────────────────────────
        // PHASE 2 — Image swap via alt-text matching
        // Finds stock images whose alt-text matches a tag
        // name, then replaces the underlying media file.
        // ──────────────────────────────────────────────
        if (Object.keys(imageBuffers).length > 0) {
            console.log('\n=== Phase 2: Image injection ===');
            buf = injectChartImages(buf, imageBuffers);
        } else {
            console.log('\n=== Phase 2: Skipped (no images) ===');
        }

        // --- Send response ---
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=Analysis_${data.s_date || 'report'}.docx`
        });
        res.send(buf);

    } catch (error) {
        console.error('❌ Generate report error:', error);
        console.error('Stack:', error.stack);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

app.get('/get-my-data', (req, res) => { res.json(cachedData); });
app.listen(3000, () => console.log('Server running at http://localhost:3000'));
