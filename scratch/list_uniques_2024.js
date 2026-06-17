const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['進路状況入力シート'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const schools = new Set();
const otherPaths = new Set();

for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const schoolName = row[3];
    const otherPath = row[8];
    const isDecided = row[9];

    if (isDecided === '○' && schoolName) {
        schools.add(schoolName);
    }
    if (otherPath) {
        otherPaths.add(otherPath);
    }
}

console.log('Unique Decided Schools:', Array.from(schools).sort());
console.log('Unique Other Paths:', Array.from(otherPaths).sort());
