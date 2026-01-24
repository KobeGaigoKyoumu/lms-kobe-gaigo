const XLSX = require('xlsx');
const EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = '歴代受験記録'; // Based on previous script
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        console.log('Headers:', headers);
    } else {
        console.log('Sheet not found. Available sheets:', workbook.SheetNames);
    }
} catch (e) {
    console.error('Error:', e.message);
}
