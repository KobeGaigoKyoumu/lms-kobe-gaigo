
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/在籍者.xlsx';
const wb = XLSX.readFile(filePath);
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws);

const years = new Set();
data.forEach(row => {
    const id = row['学籍番号'];
    if (id) {
        const prefix = String(id).substring(0, 2);
        years.add(prefix);
    }
});

fs.writeFileSync('enrollment_years.txt', `Unique ID Prefixes: ${Array.from(years).sort().join(', ')}`);
