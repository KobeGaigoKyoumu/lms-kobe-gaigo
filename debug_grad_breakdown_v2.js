const XLSX = require('xlsx');
const path = require('path');

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
let results = [];

function getValue(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined) return row[key];
    }
    return null;
}

FILES.forEach(({ file, year }) => {
    try {
        const wb = XLSX.readFile(path.join(DATA_DIR, file));
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        let g = 0;
        let c = 0;
        let completedNames = [];

        rows.forEach(row => {
            const status = getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']);
            if (status === '卒業') g++;
            else if (status === '修了' || status === '延長') {
                if (status === '修了') c++;
                completedNames.push({
                    name: getValue(row, ['氏名', '名前', 'Name', '氏　名']),
                    status: status,
                    dest: getValue(row, ['進学先', '最終合格校', '就職先', 'Destination', 'School']) || 'None'
                });
            }
        });

        results.push({
            year,
            grad: g,
            comp: c,
            total: g + c,
            target: TARGETS[year],
            diff: (g + c) - TARGETS[year],
            compNames: completedNames
        });
    } catch (e) {
        results.push({ year, error: e.message });
    }
});

console.log(JSON.stringify(results, null, 2));
