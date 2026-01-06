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

    // Inspect Row 3 (Index 2) or Row 4 (Index 3) - Student Data
    // Note: JS rows 0-indexed. Visually Row 3 might be Index 2.
    // Let's assume header is R1, data is R2.

    console.log('--- Data Inspection (Row 2, 3) ---');
    for (let R = 1; R <= 3; ++R) {
        let rowData = {};
        for (let C = 5; C <= 30; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
            if (cell) {
                rowData[C] = cell.v;
            }
        }
        console.log(`Row ${R}:`, rowData);
    }

} catch (e) {
    console.error(e);
}
