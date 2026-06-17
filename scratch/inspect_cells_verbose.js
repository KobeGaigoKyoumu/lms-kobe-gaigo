const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
const wb = XLSX.readFile(excelPath);
const ws1 = wb.Sheets['2025'];

console.log('=== Verbose Cell Dump for Row 0 to 23 ===');
for (let r = 0; r < 24; r++) {
    const rowCells = [];
    for (let c = 0; c < 20; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws1[addr];
        if (cell) {
            // 値があるセルだけでなく、プロパティをもう少し詳しく
            rowCells.push(`${addr}(col:${c}): ${JSON.stringify(cell.v)} (${cell.t})`);
        }
    }
    if (rowCells.length > 0) {
        console.log(`Row ${r}:`, rowCells.join(' | '));
    } else {
        console.log(`Row ${r}: (empty)`);
    }
}

console.log('\n=== Merges in first block (s.r < 24) ===');
if (ws1['!merges']) {
    ws1['!merges'].forEach((m, idx) => {
        if (m.s.r < 24) {
            console.log(`Merge ${idx}: ${XLSX.utils.encode_cell(m.s)} to ${XLSX.utils.encode_cell(m.e)}`);
        }
    });
}
