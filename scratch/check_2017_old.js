const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const oldFilePath = path.join(__dirname, '../../lms-kobe-gaigo-data/卒業生進路一覧/2017年度入学生進路一覧.xlsx');

if (!fs.existsSync(oldFilePath)) {
    console.log('Old 2017 file not found at:', oldFilePath);
    process.exit(1);
}

try {
    const wb = XLSX.readFile(oldFilePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Old 2017 File has ${rows.length} rows.`);
    console.log('Header:', rows[0]);
    console.log('Sample rows (first 10):');
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        console.log(`  Row ${i}:`, JSON.stringify(rows[i]));
    }
} catch (e) {
    console.log('Error reading old 2017 file:', e.message);
}
