const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const app = express();

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

// Now the route just sends the data that is already in the server's brain
app.get('/get-my-data', (req, res) => {
    res.json(cachedData); 
});

app.listen(3000, () => console.log('Waiter is ready at http://localhost:3000'));