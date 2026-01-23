const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetNames = workbook.SheetNames;
    console.log('Sheets:', sheetNames);

    sheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            console.log(`\n--- Sheet: ${name} ---`);
            console.log('Headers:', data[0]);
            console.log('First Row:', data[1]);
        }
    });

} catch (err) {
    console.error('Error reading Excel:', err);
}
