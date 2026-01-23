const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';
const OUTPUT_FILE = 'headers_sheet1.txt';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = 'Sheet1';
    const sheet = workbook.Sheets[sheetName];

    if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length > 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows[0], null, 2));
            console.log('Sheet1 Headers written to headers_sheet1.txt');

            // Also print first few rows to see data shape
            const sample = rows.slice(1, 6);
            console.log('Sample data:', JSON.stringify(sample, null, 2));
        }
    } else {
        console.log('Sheet1 not found');
    }

} catch (err) {
    console.error('Error:', err);
}
