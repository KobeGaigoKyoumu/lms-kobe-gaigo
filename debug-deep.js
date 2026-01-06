const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '成績評価シート_202502_2-1.xlsm');
const workbook = XLSX.readFile(filePath);

const sheet4Index = 4;
const sheet4Name = workbook.SheetNames[sheet4Index];
console.log(`Sheet 4 Name: ${sheet4Name}`);

const sheet = workbook.Sheets[sheet4Name];
const range = XLSX.utils.decode_range(sheet['!ref']);
console.log(`Range: s.r=${range.s.r}, e.r=${range.e.r}, s.c=${range.s.c}, e.c=${range.e.c}`);

console.log('\n--- ID Column (Col 1 / B) Inspection (Rows 0-20) ---');
for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    const cellAddress = XLSX.utils.encode_cell({ r: r, c: 1 });
    const cell = sheet[cellAddress];
    console.log(`Row ${r}, Col 1 (ID):`, cell ? JSON.stringify(cell) : 'null');
}

console.log('\n--- Vocabulary Column (Col 15 / P) Inspection (Rows 0-20) ---');
for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    const cellAddress = XLSX.utils.encode_cell({ r: r, c: 15 });
    const cell = sheet[cellAddress];
    console.log(`Row ${r}, Col 15 (Vocab):`, cell ? JSON.stringify(cell) : 'null');
}

console.log('\n--- Comparing Sheet 0 IDs with Sheet 4 IDs ---');
const sheet0 = workbook.Sheets[workbook.SheetNames[0]];
const data0 = XLSX.utils.sheet_to_json(sheet0, { header: 1 });

// Assuming Sheet 0 Header is Row 2 (Index 1) based on previous generic search
let sheet0IDs = [];
for (let i = 0; i < Math.min(data0.length, 20); i++) {
    if (data0[i] && data0[i][1] && String(data0[i][1]).match(/^\d+$/)) {
        sheet0IDs.push({ row: i, id: data0[i][1] });
    }
}
console.log('Sheet 0 Sample IDs:', sheet0IDs.slice(0, 5));

console.log('\n--- Checking matches in Sheet 4 ---');
sheet0IDs.slice(0, 5).forEach(item => {
    const id = String(item.id).trim();
    let found = false;
    for (let r = range.s.r; r <= range.e.r; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: r, c: 1 })];
        if (cell && String(cell.v).trim() === id) {
            const vocabCell = sheet[XLSX.utils.encode_cell({ r: r, c: 15 })];
            console.log(`ID ${id} found in Sheet 4 at Row ${r}. Vocab (Col 15): ${vocabCell ? JSON.stringify(vocabCell) : 'null'}`);
            found = true;
            break;
        }
    }
    if (!found) console.log(`ID ${id} NOT found in Sheet 4`);
});
