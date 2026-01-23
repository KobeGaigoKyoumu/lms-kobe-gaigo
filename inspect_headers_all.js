
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const FILES = [
    '2017年度入学生進路一覧.xlsx',
    '2018年度入学生進路一覧.xlsx',
    '2019年度入学生進路一覧.xlsx',
    '2022年度入学生進路一覧.xlsx',
    '2023年度入学生進路一覧.xlsx',
];

// Clear report file
fs.writeFileSync('headers_report.txt', '--- Header Inspection ---\n');

FILES.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
        fs.appendFileSync('headers_report.txt', `File not found: ${file}\n`);
        return;
    }

    try {
        const wb = XLSX.readFile(filePath);
        const sheetName = wb.SheetNames[0]; // First sheet (usually master list)
        const ws = wb.Sheets[sheetName];
        // Read first 2 rows
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

        if (data.length > 0) {
            const msg = `\nFile: ${file} (Sheet: ${sheetName})\nHeader Row (0): ${JSON.stringify(data[0])}\nRow 1: ${JSON.stringify(data[1] || [])}\n`;
            fs.appendFileSync('headers_report.txt', msg);
        } else {
            fs.appendFileSync('headers_report.txt', `\nFile: ${file} (Sheet: ${sheetName}) - No data found\n`);
        }

        // Also check if there is a 'Graduates' list in other sheets?
        // Let's just list ALL sheets and their headers
        /*
        wb.SheetNames.forEach(sName => {
             if (sName !== sheetName) {
                 const sWs = wb.Sheets[sName];
                 const sData = XLSX.utils.sheet_to_json(sWs, { header: 1, range: 0 });
                 if (sData.length > 0) {
                     fs.appendFileSync('headers_report.txt', `  Sheet: ${sName} - Header: ${JSON.stringify(sData[0])}\n`);
                 }
             }
        });
        */

    } catch (e) {
        fs.appendFileSync('headers_report.txt', `Error reading ${file}: ${e.message}\n`);
    }
});
