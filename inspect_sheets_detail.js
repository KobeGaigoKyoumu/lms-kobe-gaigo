
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const FILES = [
    '2017年度入学生進路一覧.xlsx',
    '2018年度入学生進路一覧.xlsx',
    '2019年度入学生進路一覧.xlsx',
    '2020年度入学生進路一覧.xlsx',
    '2022年度入学生進路一覧.xlsx',
    '2023年度入学生進路一覧.xlsx',
];

FILES.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (fs.existsSync(filePath)) {
        console.log(`\n--- ${file} ---`);
        const wb = XLSX.readFile(filePath);
        wb.SheetNames.forEach(name => {
            const ws = wb.Sheets[name];
            const data = XLSX.utils.sheet_to_json(ws);
            console.log(`Sheet: "${name}" - Rows: ${data.length}`);
            if (data.length > 0) {
                const cols = Object.keys(data[0]);
                console.log(`   Cols: ${cols.slice(0, 5).join(', ')}...`);
            }
        });
    }
});
