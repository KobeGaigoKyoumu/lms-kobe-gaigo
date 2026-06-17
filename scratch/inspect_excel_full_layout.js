const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
const wb = XLSX.readFile(excelPath);
const ws1 = wb.Sheets['2025'];

console.log('=== Full Layout (Row 0 to 23) ===');
for (let r = 0; r < 24; r++) {
    const cols = [];
    for (let c = 0; c < 20; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws1[addr];
        if (cell) {
            cols.push(`${XLSX.utils.encode_col(c)}: ${JSON.stringify(cell.v)} (${cell.t})`);
        } else {
            // セルオブジェクト自体が存在しない場合もチェック
        }
    }
    console.log(`Row ${r + 1} (r:${r}):`, cols.join(' | '));
}

console.log('\n=== Merges starting in Row 0 to 23 ===');
const merges = ws1['!merges'] || [];
const firstBlockMerges = merges.filter(m => m.s.r < 24).sort((a, b) => a.s.r - b.s.r || a.s.c - b.s.c);
firstBlockMerges.forEach(m => {
    console.log(`Merge: ${XLSX.utils.encode_cell(m.s)} to ${XLSX.utils.encode_cell(m.e)} (Rows: ${m.s.r + 1}-${m.e.r + 1}, Cols: ${XLSX.utils.encode_col(m.s.c)}-${XLSX.utils.encode_col(m.e.c)})`);
});
