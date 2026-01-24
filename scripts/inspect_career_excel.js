const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const CAREER_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const FILES = ['2023年度入学生進路一覧.xlsx', '2019年度入学生進路一覧.xlsx'];

const results = {};
FILES.forEach(file => {
    const filePath = path.join(CAREER_DIR, file);
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const datasheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(datasheet, { header: 1 });

        // Find header row
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            if (row && row.some(cell => String(cell).includes('学籍番号') || String(cell).includes('氏名') || String(cell).includes('進学先'))) {
                headerRowIndex = i;
                break;
            }
        }

        results[file] = {
            headerRowIndex,
            headers: rows[headerRowIndex],
            sample: rows[headerRowIndex + 1]
        };
    } catch (e) {
        results[file] = { error: e.message };
    }
});

fs.writeFileSync('scripts/career_excel_headers.json', JSON.stringify(results, null, 2));
console.log('Done.');
