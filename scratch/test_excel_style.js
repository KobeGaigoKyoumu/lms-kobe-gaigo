const XLSX = require('xlsx');
const path = require('path');

const srcPath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
const destPath = path.join(__dirname, 'output_test.xlsx');

try {
    const wb = XLSX.readFile(srcPath);
    const ws1 = wb.Sheets['2025'];
    
    // F2 の値を書き換え (Row 1, Col 5)
    const cellAddr = 'F2';
    if (ws1[cellAddr]) {
        console.log('Original cell value:', ws1[cellAddr].v);
        ws1[cellAddr].v = 'TEST NAME CHANGED';
    } else {
        console.log('Cell F2 not found, setting it');
        ws1[cellAddr] = { t: 's', v: 'TEST NAME CHANGED' };
    }
    
    XLSX.writeFile(wb, destPath);
    console.log('Successfully wrote to:', destPath);
} catch (e) {
    console.error('Error during test:', e);
}
