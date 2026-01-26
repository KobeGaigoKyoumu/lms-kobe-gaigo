const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const FILES = {
    2019: '2019年度入学生進路一覧.xlsx',
    2020: '2020年度入学生進路一覧.xlsx',
    2022: '2022年度入学生進路一覧.xlsx'
};

function getValue(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined) return row[key];
    }
    return '';
}

const logFile = 'problem_years.txt';
fs.writeFileSync(logFile, 'Problem Years Analysis:\n');

Object.entries(FILES).forEach(([year, file]) => {
    try {
        const wb = XLSX.readFile(path.join(DATA_DIR, file));
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        fs.appendFileSync(logFile, `\n=== ${year} ===\n`);
        rows.forEach(row => {
            const status = getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']);
            const name = getValue(row, ['氏名', '名前', 'Name', '氏　名']);
            const dest = getValue(row, ['進学先', '最終合格校', '就職先', 'Destination', 'School']);
            const cat = getValue(row, ['進路区分', '区分', 'Category']);

            if (year === '2019' && status === '延長') {
                fs.appendFileSync(logFile, `[EXTENDED] ${name} | Dest: "${dest}" | Cat: "${cat}"\n`);
            }
            if ((year === '2020' || year === '2022') && status === '修了') {
                fs.appendFileSync(logFile, `[COMPLETED] ${name} | Dest: "${dest}" | Cat: "${cat}"\n`);
            }
        });
    } catch (e) { fs.appendFileSync(logFile, e.message + '\n'); }
});
