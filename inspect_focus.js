const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'e:\\デスクトップ\\LMS(神戸外語)\\lms-app\\成績評価シート_202502_2-1.xlsm';

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find sheet
    let sheetName = workbook.SheetNames.find(n => n.includes('総合成績') || (n.includes('評価') && !n.includes('シート')));
    if (!sheetName) sheetName = workbook.SheetNames[3];

    const sheet = workbook.Sheets[sheetName];

    // Inspect Row 2 (Index 2 - First Student)
    // R=1 (Header), R=2 (Data)
    // We want to see C12 to C26

    console.log('--- Row 2 Parsing (C12-C26) ---');
    let r2 = {};
    for (let C = 11; C <= 27; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ c: C, r: 2 })]; // Row Index 2 = Row 3 visually
        if (cell) r2[C] = cell.v;
    }
    console.log(JSON.stringify(r2, null, 2));

    console.log('--- Row 1 Header Check (C12-C26) ---');
    let r1 = {};
    for (let C = 11; C <= 27; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ c: C, r: 1 })]; // Row Index 1 = Row 2 visually
        if (cell) r1[C] = cell.v || cell.w;
    }
    console.log(JSON.stringify(r1, null, 2));

} catch (e) {
    console.error(e);
}
