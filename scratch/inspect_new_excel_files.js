const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    { year: 2017, name: '2017年度　卒業生　卒業進路.xlsx' },
    { year: 2018, name: '2018年度　進路状況.xlsx' },
    { year: 2019, name: '2019年度　進路状況(20200615)②.xlsx' },
    { year: 2020, name: '2020年度　卒業進路.xlsx' },
    { year: 2021, name: '2021年度　進路状況.xlsx' },
    { year: 2022, name: '2022年度　進路状況.xlsx' },
    { year: 2023, name: '2023年度　進路一覧.xlsx' },
    { year: 2024, name: '2024年度　進路一覧.xlsx' },
    { year: 2025, name: '2025年度 進路状況【最新版】.xlsx' }
];

console.log('=== Inspecting Excel Files ===');

files.forEach(f => {
    const filePath = path.join(__dirname, '../', f.name);
    if (!fs.existsSync(filePath)) {
        console.log(`[Error] File not found: ${f.name}`);
        return;
    }
    
    try {
        const wb = XLSX.readFile(filePath);
        console.log(`\nFile: ${f.name} (Year: ${f.year})`);
        console.log(`Sheet Names:`, wb.SheetNames);
        
        // Inspect first sheet
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        console.log(`Total Rows in sheet '${sheetName}': ${rows.length}`);
        
        // Print first 8 rows to identify header and start of data
        console.log('Sample rows (first 8):');
        for (let i = 0; i < Math.min(8, rows.length); i++) {
            const rowStr = JSON.stringify(rows[i]);
            console.log(`  Row ${i}: ${rowStr}`);
        }
    } catch (e) {
        console.log(`[Error] Failed to read ${f.name}: ${e.message}`);
    }
});
