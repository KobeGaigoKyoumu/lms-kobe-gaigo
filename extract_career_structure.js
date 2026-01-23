const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2023年度入学生進路一覧.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Write headers to file
const output = {
    headers: data[0],
    sampleRows: data.slice(1, 5),
    totalRows: data.length
};

fs.writeFileSync('career_data_structure.json', JSON.stringify(output, null, 2), 'utf8');
console.log('Data structure saved to career_data_structure.json');
console.log('Headers count:', data[0].length);
console.log('Total rows:', data.length);
