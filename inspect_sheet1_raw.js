
const XLSX = require('xlsx');
const path = require('path');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2017年度入学生進路一覧.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Sheet1']; // Assuming Sheet1 is the main list
const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // header:1 returns array of arrays

console.log('--- Raw Rows (0-5) ---');
data.slice(0, 5).forEach((row, i) => {
    console.log(`Row ${i}: ${JSON.stringify(row)}`);
});
