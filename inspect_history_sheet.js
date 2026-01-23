const XLSX = require('xlsx');
const FILE_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = '歴代受験記録';
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.log(`Sheet ${sheetName} not found.`);
        process.exit(1);
    }

    // Get headers (row 0) and first 10 rows
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n=== SHEET: ${sheetName} ===`);
    console.log('Headers:', rows[0]);

    console.log('\nSample Rows:');
    rows.slice(1, 11).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, JSON.stringify(row));
    });

} catch (err) {
    console.error('Error:', err);
}
