const XLSX = require('xlsx');
const EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets['歴代受験記録'];
    if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet);
        let passCount = 0;
        let failCount = 0;
        let otherCount = 0;
        const unique = new Set();
        rows.forEach(row => {
            const val = row['合否'] || '';
            unique.add(val);
            if (val.includes('合格') && !val.includes('不合格')) passCount++;
            else if (val.includes('不合格')) failCount++;
            else otherCount++;
        });
        console.log(`Passed: ${passCount}, Failed: ${failCount}, Other: ${otherCount}`);
        console.log('Unique raw values (first 5):', Array.from(unique).slice(0, 5));
    }
} catch (e) {
    console.error(e);
}
