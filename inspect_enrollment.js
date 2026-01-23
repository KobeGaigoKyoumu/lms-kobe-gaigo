
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/在籍者.xlsx';

try {
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    fs.writeFileSync('enrollment_headers.txt', `File: 在籍者.xlsx (Sheet: ${sheetName})\nHeader: ${JSON.stringify(data[0])}\nRow 1: ${JSON.stringify(data[1] || [])}\n`);
} catch (e) {
    fs.writeFileSync('enrollment_headers.txt', `Error: ${e.message}`);
}
