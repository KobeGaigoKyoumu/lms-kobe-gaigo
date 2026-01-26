const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    '2017年度入学生進路一覧.xlsx',
    '2018年度入学生進路一覧.xlsx',
    '2019年度入学生進路一覧.xlsx',
    '2020年度入学生進路一覧.xlsx',
    '2022年度入学生進路一覧.xlsx',
    '2023年度入学生進路一覧.xlsx'
];

let totalGrads = 0;
let totalShuryo = 0;

files.forEach(file => {
    try {
        const filePath = path.join('e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧', file);
        const wb = XLSX.readFile(filePath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        let g = 0, s = 0;
        rows.forEach(row => {
            const kS = Object.keys(row).find(k => k.includes('卒') && k.includes('退')) || Object.keys(row).find(k => k.includes('状況'));
            const st = String(row[kS] || '').trim();
            if (st === '卒業') g++;
            if (st === '修了') s++;
        });
        console.log(`${file}: 卒業=${g}, 修了=${s}`);
        totalGrads += g;
        totalShuryo += s;
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});

console.log('--- Total ---');
console.log(`卒業 total: ${totalGrads}`);
console.log(`修了 total: ${totalShuryo}`);
console.log(`Sum: ${totalGrads + totalShuryo}`);
