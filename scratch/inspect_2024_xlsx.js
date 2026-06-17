const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);

const ws = wb.Sheets['進路状況入力シート'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('=== 進路状況入力シート (Row 0-30) ===');
for (let i = 0; i < Math.min(30, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
