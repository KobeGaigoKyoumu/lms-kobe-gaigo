const XLSX = require('xlsx');
const EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2023年度入学生進路一覧.xlsx';

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet);
        const uniqueStatus = new Set();
        rows.forEach(row => {
            if (row['進路状況']) uniqueStatus.add(row['進路状況']);
        });
        console.log('Unique Career Statuses:', Array.from(uniqueStatus));
    }
} catch (e) {
    console.error('Error:', e.message);
}
