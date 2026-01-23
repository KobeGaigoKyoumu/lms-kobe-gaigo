const XLSX = require('xlsx');
const path = require('path');

const dataDir = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';

// Read all Excel files
const files = [
    '2017年度入学生進路一覧.xlsx',
    '2018年度入学生進路一覧.xlsx',
    '2019年度入学生進路一覧.xlsx',
    '2020年度入学生進路一覧.xlsx',
    '2022年度入学生進路一覧.xlsx',
    '2023年度入学生進路一覧.xlsx'
];

// Inspect the 2023 file in detail
const filePath = path.join(dataDir, '2023年度入学生進路一覧.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('=== 2023年度入学生進路一覧 ===');
console.log('Sheet names:', wb.SheetNames);
console.log('Total rows:', data.length);
console.log('\n=== Headers (Row 0) ===');
console.log(data[0]);
console.log('\n=== Sample Data (Rows 1-3) ===');
for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
    console.log(`Row ${i}:`, data[i]);
}

// Count unique values in career-related columns
const headers = data[0];
console.log('\n=== Column Analysis ===');

// Find career-related columns
headers.forEach((header, idx) => {
    if (header && (
        header.includes('進') ||
        header.includes('就職') ||
        header.includes('区分') ||
        header.includes('種別') ||
        header.includes('学校')
    )) {
        console.log(`\nColumn ${idx}: "${header}"`);
        const values = {};
        for (let i = 1; i < data.length; i++) {
            const val = data[i][idx];
            if (val) {
                values[val] = (values[val] || 0) + 1;
            }
        }
        console.log('Values:', values);
    }
});
