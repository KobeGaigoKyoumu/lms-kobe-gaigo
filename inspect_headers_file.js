const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';
const OUTPUT_FILE = 'headers.txt';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = '歴代受験記録';
    const sheet = workbook.Sheets[sheetName];

    if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length > 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows[0], null, 2));
            console.log('Headers written to headers.txt');
        }
    } else {
        console.log('Sheet not found');
    }

} catch (err) {
    console.error('Error:', err);
}
