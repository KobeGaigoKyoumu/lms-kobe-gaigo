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
const logFile = 'university_rule_result.txt';
fs.writeFileSync(logFile, 'Year | Total | Target | Match?\n');

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

        let count = 0;

        rows.forEach(row => {
            const status = getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']);
            const dest = getValue(row, ['進学先', '最終合格校', '就職先', 'Destination', 'School']);
            // const cat = getValue(row, ['進路区分', '区分', 'Category']);

            const isGrad = status === '卒業';
            const isExt = status === '延長'; // Always include Extended?
            const isComp = status === '修了';

            const isUniversity = dest && dest.includes('大学') && !dest.includes('大学校');// Exclude things like "Automotive University School" (大学校) if strictly University? Actually "大学" usually matches "大学".
            // Note: Some "Vocational" have "College" (カレッジ) or "Academy".

            if (isGrad) {
                count++;
            } else if (isExt) {
                count++; // Assume Extended are pending valid?
            } else if (isComp) {
                if (isUniversity) count++;
            }
        });

        totalCalc += count;
        const diff = count - TARGETS[year];
        fs.appendFileSync(logFile, `${year} | ${count} | ${TARGETS[year]} | ${diff === 0 ? 'OK' : diff}\n`);

    } catch (err) {
        fs.appendFileSync(logFile, `Error ${year}: ${err.message}\n`);
    }
});

fs.appendFileSync(logFile, `TOTAL: ${totalCalc} (Target 888) -> Diff: ${totalCalc - 888}\n`);
