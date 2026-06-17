const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['進路状況入力シート'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('--- Inspecting declined or special status rows ---');
let count = 0;

for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = row[0];
    const name = row[2];
    const schoolName = row[3];
    const status = row[5];
    const otherPath = row[8];
    const isDecided = row[9];

    if (!studentId || isNaN(Number(studentId))) continue;

    if (status === '辞退' || status === '入学取消') {
        count++;
        console.log(`Row ${i + 1}: StudentId=${studentId}, Name=${name}, School=${schoolName}, Status=${status}, Decided=${isDecided}`);
    }
}
console.log('Total declined/canceled rows:', count);
