const XLSX = require('xlsx');
const FILE_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const targetSheets = ['歴代受験記録', 'Sheet1'];

    targetSheets.forEach(name => {
        const sheet = workbook.Sheets[name];
        if (sheet) {
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`\n=== HEADER FOR SHEET: ${name} ===`);
            if (rows.length > 0) {
                console.log(JSON.stringify(rows[0], null, 2));
            } else {
                console.log('Empty Sheet');
            }
        } else {
            console.log(`\nSheet ${name} not found`);
        }
    });

} catch (err) {
    console.error('Error:', err);
}
