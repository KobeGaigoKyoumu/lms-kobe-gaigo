const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['進路状況入力シート'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const statusCounts = {};
let totalRows = 0;
let decidedPass = 0;
let undecidedPass = 0;

for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = row[0];
    const schoolName = row[3];
    const status = row[5];
    const isDecided = row[9];

    if (!studentId || isNaN(Number(studentId))) continue;

    totalRows++;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (schoolName) {
        if (isDecided === '○') {
            decidedPass++;
        } else if (status === '合格') {
            undecidedPass++;
        }
    }
}

console.log('--- Excel Exam Rows Stats ---');
console.log('Total valid student rows:', totalRows);
console.log('Status breakdown:', statusCounts);
console.log('School name exists & isDecided === "○":', decidedPass);
console.log('School name exists & status === "合格" (but isDecided !== "○"):', undecidedPass);
