const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'e:\\デスクトップ\\LMS(神戸外語)\\lms-app\\成績評価シート_202502_2-1.xlsm';

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find sheet
    let sheetName = workbook.SheetNames.find(n => n.includes('総合成績') || (n.includes('評価') && !n.includes('シート')));
    if (!sheetName) sheetName = workbook.SheetNames[3];

    console.log(`Target Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];

    // Read first few rows to find headers
    const range = XLSX.utils.decode_range(sheet['!ref']);

    console.log('--- Headers Scan ---');
    for (let R = 0; R <= 5; ++R) {
        let rowData = [];
        for (let C = 0; C <= range.e.c; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
            let val = cell ? (cell.v || cell.w) : null;
            // Simplify simplified logging
            if (val) rowData.push(`[${C}:${val}]`);
        }
        if (rowData.length > 0) {
            console.log(`Row ${R}:`, rowData.join(', '));
        }
    }

} catch (e) {
    console.error(e);
}
