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

const TARGETS = { 2017: 159, 2018: 139, 2019: 57, 2020: 45, 2022: 238, 2023: 250 };
let totalCalc = 0;
const logFile = 'verification_result.txt';
fs.writeFileSync(logFile, 'Year | Grad | Comp (Valid) | Ext (Valid) | Total | Target | Match?\n');

function getValue(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined) return row[key];
    }
    return '';
}

FILES.forEach(({ file, year }) => {
    try {
        const wb = XLSX.readFile(path.join(DATA_DIR, file));
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        let g = 0;
        let c = 0;
        let e = 0;

        rows.forEach(row => {
            const status = getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']);
            const dest = getValue(row, ['進学先', '最終合格校', '就職先', 'Destination', 'School']);
            // Filter: Must have destination and not "Return to country"
            const hasDest = dest && dest.trim() !== '' && dest.trim() !== '帰国';

            if (status === '卒業') {
                g++;
            } else if (status === '修了') {
                if (hasDest) c++;
            } else if (status === '延長') {
                if (hasDest) e++;
            }
        });

        const yearlyTotal = g + c + e;
        totalCalc += yearlyTotal;
        const diff = yearlyTotal - TARGETS[year];

        const line = `${year} | ${g} | ${c} | ${e} | ${yearlyTotal} | ${TARGETS[year]} | ${diff === 0 ? 'OK' : diff}\n`;
        fs.appendFileSync(logFile, line);
    } catch (err) {
        fs.appendFileSync(logFile, `Error ${year}: ${err.message}\n`);
    }
});

fs.appendFileSync(logFile, `TOTAL: ${totalCalc} (Target 888) -> Diff: ${totalCalc - 888}\n`);
