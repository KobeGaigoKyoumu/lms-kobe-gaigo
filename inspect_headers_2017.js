
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const file = '2017年度入学生進路一覧.xlsx';
const filePath = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2017年度入学生進路一覧.xlsx';

fs.writeFileSync('headers_2017_all.txt', `--- Headers for ${file} ---\n`);

try {
    const wb = XLSX.readFile(filePath);
    wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length > 0) {
            fs.appendFileSync('headers_2017_all.txt', `\nSheet: ${sheetName}\nHeader: ${JSON.stringify(data[0])}\n`);
        }
    });
} catch (e) {
    fs.appendFileSync('headers_2017_all.txt', `Error: ${e.message}\n`);
}
