const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const AdmZip = require('adm-zip');
const app = express();

app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json())
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

// Function to insert images into Word document
function insertImagesIntoWord(wordBuffer, images) {
    try {
        const zip = new AdmZip(wordBuffer);
        
        // Read document.xml
        const documentEntry = zip.getEntry('word/document.xml');
        if (!documentEntry) {
            console.error('Could not find document.xml');
            return wordBuffer;
        }
        
        let documentXml = documentEntry.getData().toString('utf8');
        
        // Read and update relationships
        let relsXml = '';
        let nextRelId = 1;
        const relsEntry = zip.getEntry('word/_rels/document.xml.rels');
        if (relsEntry) {
            relsXml = relsEntry.getData().toString('utf8');
            // Find highest existing rId
            const relIdMatches = relsXml.match(/rId(\d+)/g);
            if (relIdMatches) {
                const maxId = Math.max(...relIdMatches.map(m => parseInt(m.replace('rId', ''))));
                nextRelId = maxId + 1;
            }
        } else {
            // Create new relationships file
            relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        }
        
        // Process each image
        Object.keys(images).forEach(imageKey => {
            const imageBuffer = images[imageKey];
            const imageName = `image_${imageKey.replace('_image', '')}.png`;
            const relId = `rId${nextRelId++}`;
            
            // Add image to word/media/ folder
            zip.addFile(`word/media/${imageName}`, imageBuffer);
            console.log(`✅ Added image file: word/media/${imageName}`);
            
            // Add relationship
            const relEntry = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`;
            relsXml = relsXml.replace('</Relationships>', `${relEntry}</Relationships>`);
            
            // Calculate size (6x4 inches default, 7x5 for age chart)
            const width = imageKey.includes('age') ? 7 : 6;
            const height = imageKey.includes('age') ? 5 : 4;
            const cx = width * 914400; // Convert inches to EMUs
            const cy = height * 914400;
            
            // Create image XML element
            const imageXml = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${relId}" name="${imageName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${imageName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
            
            // Replace placeholder with image XML
            const placeholder = `{${imageKey}}`;
            if (documentXml.includes(placeholder)) {
                documentXml = documentXml.replace(placeholder, imageXml);
                console.log(`✅ Replaced ${placeholder} with image (${width}x${height} inches)`);
            } else {
                console.log(`⚠️ Placeholder ${placeholder} not found in document`);
            }
        });
        
        // Update files
        zip.updateFile('word/document.xml', Buffer.from(documentXml, 'utf8'));
        zip.updateFile('word/_rels/document.xml.rels', Buffer.from(relsXml, 'utf8'));
        
        return zip.toBuffer();
    } catch (error) {
        console.error('Error inserting images:', error);
        console.error('Stack:', error.stack);
        return wordBuffer;
    }
}

app.post('/generate-report', (req, res) => {
    try {
        // Use the spread operator to get all variables sent from the frontend
        const data = req.body;
        
        // Extract and process images
        const images = {};
        const textData = { ...data };
        
        Object.keys(data).filter(k => k.includes('_image')).forEach(key => {
            const imageValue = data[key];
            if (imageValue && typeof imageValue === 'string' && imageValue.startsWith('data:image')) {
                try {
                    const base64Data = imageValue.split(',')[1];
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    images[key] = imageBuffer;
                    // Remove from text data
                    delete textData[key];
                    console.log(`✅ Processed ${key}, size: ${imageBuffer.length} bytes`);
                } catch (e) {
                    console.error(`❌ Failed to process ${key}:`, e.message);
                }
            }
        }); 

        const content = fs.readFileSync(
            path.resolve(__dirname, 'Group Profile CorporateHRA Scan.docx'),
            'binary'
        );

        const zip = new PizZip(content);
        
        // Generate document with text placeholders only (no images)
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
        });

        // Render document with text data only
        console.log('\n=== Starting document render (text only) ===');
        doc.render(textData);
        console.log('✅ Document rendered successfully');

        // Generate Word document buffer
        let buf = doc.getZip().generate({ type: 'nodebuffer' });
        
        // Insert images into the document
        if (Object.keys(images).length > 0) {
            console.log(`\n=== Inserting ${Object.keys(images).length} images ===`);
            buf = insertImagesIntoWord(buf, images);
            console.log('✅ Images inserted successfully');
        }
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=Analysis_${data.s_date}.docx`
        });
        res.send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/get-my-data', (req, res) => { res.json(cachedData); });
app.listen(3000, () => console.log('Server running at http://localhost:3000'));