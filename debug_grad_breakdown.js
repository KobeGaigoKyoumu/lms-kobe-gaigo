const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const FILES = [
    { file: '2017年度入学生進路一覧.xlsx', year: 2017 },
    { file: '2018年度入学生進路一覧.xlsx', year: 2018 },
    { file: '2019年度入学生進路一覧.xlsx', year: 2019 },
    { file: '2020年度入学生進路一覧.xlsx', year: 2020 },
    { file: '2022年度入学生進路一覧.xlsx', year: 2022 },
    { file: '2023年度入学生進路一覧.xlsx', year: 2023 }
];

const logFile = 'debug_grad_log.txt';
fs.writeFileSync(logFile, 'Year | Graduated (卒業) | Completed (修了) | Total | Official Target | Diff\n');
fs.appendFileSync(logFile, '--- | --- | --- | --- | --- | ---\n');

const TARGETS = { 2017: 159, 2018: 139, 2019: 57, 2020: 45, 2022: 238, 2023: 250 };
let totalG = 0;
let totalC = 0;

function getValue(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined) return row[key];
    }
    return null;
}

FILES.forEach(({ file, year }) => {
    try {
        const wb = XLSX.readFile(path.join(DATA_DIR, file));
        const ws = wb.Sheets[wb.SheetNames[0]]; // First sheet only
        const rows = XLSX.utils.sheet_to_json(ws);

        let g = 0;
        let c = 0;
        let details = [];

        rows.forEach(row => {
            const status = getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']);
            if (status === '卒業') {
                g++;
            } else if (status === '修了') {
                c++;
                details.push(getValue(row, ['氏名', '名前', 'Name', '氏　名']) || 'Unknown');
            }
        });

        totalG += g;
        totalC += c;

        const myTotal = g + c;
        const diff = myTotal - TARGETS[year];
        const line = `${year} | ${g} | ${c} | ${myTotal} | ${TARGETS[year]} | ${diff > 0 ? '+' + diff : diff}\n`;
        fs.appendFileSync(logFile, line);

        if (c > 0) {
            fs.appendFileSync(logFile, `      > Completed Students (${c}): ${details.join(', ')}\n`);
        }
    } catch (e) {
        fs.appendFileSync(logFile, `Error processing ${year}: ${e.message}\n`);
    }
});

fs.appendFileSync(logFile, '---------------------------------------------------\n');
fs.appendFileSync(logFile, `TOTAL| ${totalG} | ${totalC} | ${totalG + totalC} | 888 | ${(totalG + totalC) - 888}\n`);
