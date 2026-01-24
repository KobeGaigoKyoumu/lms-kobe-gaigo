const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const CAREER_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const dbgFile = 'debug_2019_output.txt';

try {
    const files = fs.readdirSync(CAREER_DIR).filter(f => f.endsWith('.xlsx'));
    const target = files.find(f => f.includes('2019'));

    if (!target) {
        fs.writeFileSync(dbgFile, '2019 file not found in ' + CAREER_DIR);
        process.exit(1);
    }

    const filePath = path.join(CAREER_DIR, target);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet);

    let log = `File: ${target}\n`;
    log += `Rows: ${rows.length}\n`;
    if (rows.length > 0) {
        log += `Headers: ${Object.keys(rows[0]).join(', ')}\n`;
        log += `Sample Row 1: ${JSON.stringify(rows[0])}\n`;
    }

    fs.writeFileSync(dbgFile, log);
    console.log('Debug info written to ' + dbgFile);

} catch (e) {
    fs.writeFileSync(dbgFile, 'Error: ' + e.message);
}
