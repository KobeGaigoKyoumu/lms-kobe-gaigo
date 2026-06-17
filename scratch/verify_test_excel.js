const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'test_generated_survey.xlsx');
const wb = XLSX.readFile(excelPath);
const ws1 = wb.Sheets['2025'];
const ws2 = wb.Sheets['名簿2025'];

console.log('=== VERIFYING TEST GENERATED EXCEL ===');
console.log('Sheet Names:', wb.SheetNames);

console.log('\nSheet 1 ("2025") !ref:', ws1['!ref']);
console.log('Sheet 2 ("名簿2025") !ref:', ws2['!ref']);

console.log('\n--- Checking first student (index 0) in Sheet 1 ---');
console.log('C2 (Class):', ws1['C2'] ? ws1['C2'].v : 'undefined');
console.log('F2 (Name):', ws1['F2'] ? ws1['F2'].v : 'undefined');
console.log('Q1 (Num):', ws1['Q1'] ? ws1['Q1'].v : 'undefined');
console.log('C3 (Path Type):', ws1['C3'] ? ws1['C3'].v : 'undefined');
console.log('F5 (School 1):', ws1['F5'] ? ws1['F5'].v : 'undefined');

console.log('\n--- Checking row 400 (which should be deleted because N = 19 students => 19 * 24 = 456 rows) ---');
console.log('A457 (should be undefined):', ws1['A457'] ? ws1['A457'].v : 'undefined');

console.log('\n--- Checking Sheet 2 ("名簿2025") (first 3 students) ---');
for (let r = 0; r < 3; r++) {
    const sId = ws2[XLSX.utils.encode_cell({ r, c: 0 })]?.v;
    const sClass = ws2[XLSX.utils.encode_cell({ r, c: 1 })]?.v;
    const sNum = ws2[XLSX.utils.encode_cell({ r, c: 2 })]?.v;
    const sName = ws2[XLSX.utils.encode_cell({ r, c: 3 })]?.v;
    console.log(`Row ${r}: ID=${sId}, Class=${sClass}, Num=${sNum}, Name=${sName}`);
}

console.log('\n--- Checking row 20 in Sheet 2 (should be undefined because N = 19) ---');
console.log('Row 19 (r:19):', ws2[XLSX.utils.encode_cell({ r: 19, c: 0 })]?.v || 'undefined');
