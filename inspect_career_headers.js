const XLSX = require('xlsx');
const EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2023年度入学生進路一覧.xlsx';

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        console.log('Sheet:', sheetName);
        console.log('Headers:', headers);
    }
} catch (e) {
    console.error('Error:', e.message);
}
