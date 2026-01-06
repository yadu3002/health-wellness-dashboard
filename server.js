const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const fs = require('fs'); // Added
const path = require('path'); // Added
const PizZip = require('pizzip'); // Added
const Docxtemplater = require('docxtemplater'); // Added
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

app.post('/generate-report', (req, res) => {
    try {
        // Destructure the names sent from adminpage.js
        const { count, s_date, e_date } = req.body;

        console.log(`Generating report for ${count} employees from ${s_date} to ${e_date}`);

        const content = fs.readFileSync(
            path.resolve(__dirname, 'Group Profile CorporateHRA Scan.docx'),
            'binary'
        );

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // These keys must match the {tags} inside your Word File
        doc.render({
            count: count,
            s_date: s_date,
            e_date: e_date
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'attachment; filename=Report.docx'
        });
        res.send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
});

app.get('/get-my-data', (req, res) => { res.json(cachedData); });
app.listen(3000, () => console.log('Server running at http://localhost:3000'));