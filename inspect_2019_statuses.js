const XLSX = require('xlsx');
const path = require('path');

const filePath = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧/2019年度入学生進路一覧.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);

const statusCounts = {};
const allStatuses = [];

rows.forEach(row => {
    let status = 'UNDEFINED';
    ['卒業・退学', '状態', 'Status', '卒業・修了・退学'].forEach(k => {
        if (row[k]) status = row[k];
    });

    statusCounts[status] = (statusCounts[status] || 0) + 1;
    allStatuses.push({ name: row['氏名'], status });
});

console.log('2019 Status Counts:', statusCounts);
console.log('List of non-Graduated/Completed/Withdrawn:', allStatuses.filter(x => !['卒業', '修了', '退学'].includes(x.status)));
