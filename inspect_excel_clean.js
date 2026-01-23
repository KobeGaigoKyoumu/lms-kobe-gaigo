const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    console.log('Sheet Names:', JSON.stringify(workbook.SheetNames, null, 2));

    workbook.SheetNames.forEach(name => {
        // Skip likely summary sheets if evident
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        console.log(`\n=== SHEET: ${name} ===`);
        // Print first 5 rows to identify columns
        rows.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    });

} catch (err) {
    console.error('Error reading Excel:', err);
}
