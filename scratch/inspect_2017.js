const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2017年度　卒業生　卒業進路.xlsx');
try {
    const wb = XLSX.readFile(filePath);
    console.log('Sheet Names:', wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Total Rows: ${rows.length}`);
    for (let i = 0; i < Math.min(50, rows.length); i++) {
        console.log(`Row ${i}:`, JSON.stringify(rows[i]));
    }
} catch (e) {
    console.log('Error:', e.message);
}
