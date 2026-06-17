const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['進路状況入力シート'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const targetIds = ['2501002', '2410004', '2404025'];

console.log('--- Inspecting rows for target students ---');
for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = String(row[0]).trim();
    if (targetIds.includes(studentId)) {
        console.log(`Row ${i + 1}: ID=${row[0]}, Name=${row[2]}, School=${row[3]}, Status=${row[5]}, Other=${row[8]}, Decided=${row[9]}`);
    }
}
