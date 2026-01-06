const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'e:\\デスクトップ\\LMS(神戸外語)\\lms-app\\成績評価シート_202502_2-1.xlsm';

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find sheet
    let sheetName = workbook.SheetNames.find(n => n.includes('総合成績') || (n.includes('評価') && !n.includes('シート')));
    if (!sheetName) sheetName = workbook.SheetNames[3];

    console.log(`Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];

    // Scan Rows 0-3 for headers
    for (let R = 0; R <= 3; ++R) {
        console.log(`--- Row ${R} ---`);
        for (let C = 0; C <= 50; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
            if (cell) {
                let val = (cell.v || cell.w).toString().replace(/\s+/g, '');
                if (val.length > 0) {
                    console.log(`  Col ${C}: ${val}`);
                }
            }
        }
    }

} catch (e) {
    console.error(e);
}
