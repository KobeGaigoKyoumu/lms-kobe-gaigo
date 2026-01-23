
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者';
const FILES = ['修了者.xlsx', '卒業者.xlsx', '在籍者.xlsx', '退学者.xlsx'];

fs.writeFileSync('master_db_headers.txt', '--- Master DB Headers ---\n');

FILES.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    try {
        const wb = XLSX.readFile(filePath);
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length > 0) {
            fs.appendFileSync('master_db_headers.txt', `\nFile: ${file}\nHeader: ${JSON.stringify(data[0])}\nRow 1: ${JSON.stringify(data[1] || [])}\n`);
        }
    } catch (e) {
        fs.appendFileSync('master_db_headers.txt', `Error reading ${file}: ${e.message}\n`);
    }
});
