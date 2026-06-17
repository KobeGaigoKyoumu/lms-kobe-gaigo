const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
const wb = XLSX.readFile(excelPath);
const ws1 = wb.Sheets['2025'];

console.log('=== Checking rows 20-23 in multiple blocks ===');
for (let b = 0; b < 5; b++) {
    const startRow = b * 24;
    console.log(`\nBlock ${b} (Rows ${startRow + 1} to ${startRow + 24}):`);
    for (let r = startRow; r < startRow + 24; r++) {
        const localRow = r % 24;
        const rowCells = [];
        for (let c = 0; c < 20; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws1[addr];
            if (cell) {
                rowCells.push(`${XLSX.utils.encode_col(c)}${localRow + 1}: ${JSON.stringify(cell.v)}`);
            }
        }
        if (rowCells.length > 0) {
            console.log(`  Local Row ${localRow + 1}:`, rowCells.join(' | '));
        }
    }
}
