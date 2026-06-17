const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '全学生進路希望調査票2025.xlsx');

if (!fs.existsSync(excelPath)) {
    console.error('File not found:', excelPath);
    process.exit(1);
}

const wb = XLSX.readFile(excelPath);
console.log('Sheet Names:', wb.SheetNames);

// Sheet 1: '2025'
const ws1 = wb.Sheets['2025'];

console.log('=== Merges (Combined Cells) ===');
console.log((ws1['!merges'] || []).slice(0, 30));

console.log('\n=== Row Cells Detail (Rows 0 to 23) ===');
for (let r = 0; r < 24; r++) {
    const rowCells = [];
    for (let c = 0; c < 20; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws1[addr];
        if (cell) {
            rowCells.push(`${addr}: ${cell.v} (type: ${cell.t})`);
        }
    }
    if (rowCells.length > 0) {
        console.log(`Row ${r}:`, rowCells);
    }
}


