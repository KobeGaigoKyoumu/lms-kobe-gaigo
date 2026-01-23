
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2023年度入学生進路一覧.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

const classNatMap = {};
data.forEach(row => {
    const cls = row['クラス'];
    const nat = row['国籍'];
    if (cls && nat) {
        if (!classNatMap[cls]) classNatMap[cls] = {};
        classNatMap[cls][nat] = (classNatMap[cls][nat] || 0) + 1;
    }
});

fs.writeFileSync('class_nationality_correlation.txt', JSON.stringify(classNatMap, null, 2));
