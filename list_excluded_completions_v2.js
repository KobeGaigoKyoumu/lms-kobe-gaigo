const XLSX = require('xlsx');
const path = require('path');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const FILES = {
    2017: '2017年度入学生進路一覧.xlsx',
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

const completionCounts = {};
const results = [];

Object.entries(FILES).forEach(([year, file]) => {
    try {
        const wb = XLSX.readFile(path.join(DATA_DIR, file));
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        year = parseInt(year);

        rows.forEach(row => {
            const status = getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']);
            if (status !== '修了') return;

            const name = getValue(row, ['氏名', '名前', 'Name', '氏　名']);
            const dest = getValue(row, ['進学先', '最終合格校', '就職先', 'Destination', 'School']) || '(No Dest)';
            const isUniversity = dest.includes('大学') && !dest.includes('大学校');

            let included = false;
            let reason = '';

            // Replication of logic in process_career_data.js
            if (year === 2017) {
                reason = '2017 Outlier (Excluded)';
            } else if (!isUniversity) {
                reason = 'Not University';
            } else {
                // It is University and not 2017. Check Max 1 limit.
                completionCounts[year] = (completionCounts[year] || 0);
                if (completionCounts[year] >= 1) {
                    reason = 'Limit Reached (Max 1 University Completion)';
                } else {
                    included = true;
                    completionCounts[year]++;
                }
            }

            if (!included) {
                results.push({ year, name, dest, reason });
            }
        });

    } catch (e) { }
});

console.log(JSON.stringify(results, null, 2));
