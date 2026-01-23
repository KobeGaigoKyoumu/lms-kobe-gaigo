
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2017年度入学生進路一覧.xlsx';
const wb = XLSX.readFile(filePath);

const sheetsToInspect = wb.SheetNames.filter(n => n !== 'Sheet1');
let output = '';

sheetsToInspect.forEach(name => {
    const ws = wb.Sheets[name];
    if (ws) {
        output += `\n--- Sheet: ${name} ---\n`;
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Log first 20 rows
        data.slice(0, 20).forEach(row => {
            output += JSON.stringify(row) + '\n';
        });
    }
});

fs.writeFileSync('summary_sheets_2017.txt', output);
