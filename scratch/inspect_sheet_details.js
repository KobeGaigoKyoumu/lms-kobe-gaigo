const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    { year: 2017, name: '2017年度　卒業生　卒業進路.xlsx' },
    { year: 2018, name: '2018年度　進路状況.xlsx' },
    { year: 2019, name: '2019年度　進路状況(20200615)②.xlsx' },
    { year: 2020, name: '2020年度　卒業進路.xlsx' },
    { year: 2021, name: '2021年度　進路状況.xlsx' },
    { year: 2022, name: '2022年度 進路状況.xlsx' },
    { year: 2023, name: '2023年度　進路一覧.xlsx' },
    { year: 2024, name: '2024年度　進路一覧.xlsx' },
    { year: 2025, name: '2025年度 進路状況【最新版】.xlsx' }
];

console.log('=== Column Headers Map for 2017-2022 ===');
files.slice(0, 6).forEach(f => {
    const filePath = path.join(__dirname, '../', f.name);
    try {
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Find row that contains "学籍番号"
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(15, rows.length); i++) {
            if (rows[i] && rows[i].includes('学籍番号')) {
                headerRowIdx = i;
                break;
            }
        }
        
        if (headerRowIdx !== -1) {
            console.log(`Year ${f.year} Header at Row ${headerRowIdx}:`, rows[headerRowIdx]);
        } else {
            console.log(`Year ${f.year} Header: NOT FOUND "学籍番号" in first 15 rows`);
            // print first 5 rows
            for (let i = 0; i < Math.min(5, rows.length); i++) {
                console.log(`  Row ${i}:`, rows[i]);
            }
        }
    } catch (e) {
        console.log(`Year ${f.year} Error:`, e.message);
    }
});

console.log('\n=== Detail analysis of 2023 and 2024 sheet structure ===');
[2023, 2024].forEach(yr => {
    const f = files.find(x => x.year === yr);
    const filePath = path.join(__dirname, '../', f.name);
    try {
        const wb = XLSX.readFile(filePath);
        console.log(`\n--- Year ${yr} Sheets ---`);
        wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            console.log(`  Sheet: ${sheetName}, Rows: ${rows.length}`);
            if (rows.length > 0) {
                console.log(`    Header:`, rows[0]);
                if (rows.length > 1) {
                    console.log(`    Row 1:`, rows[1]);
                }
            }
        });
    } catch (e) {
        console.log(`Year ${yr} Error:`, e.message);
    }
});
