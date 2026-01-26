const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const CAREER_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const files = fs.readdirSync(CAREER_DIR).filter(f => f.endsWith('.xlsx'));

const variants = new Set();

files.forEach(file => {
    const filePath = path.join(CAREER_DIR, file);
    try {
        const workbook = XLSX.readFile(filePath);
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);
            rows.forEach(row => {
                const dest = row['進学先'] || row['進路先'] || row['就職先'] || row['進学・就職先'] || row['学校名'] || row['企業名'] || row['最終合格校'];
                if (dest && String(dest).includes('トヨタ')) {
                    variants.add(String(dest).trim());
                }
            });
        });
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
});

console.log('Variants found in Excel:');
console.log(Array.from(variants));
