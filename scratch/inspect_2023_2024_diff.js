const XLSX = require('xlsx');
const path = require('path');

const files = [
    { year: 2023, name: '2023年度　進路一覧.xlsx' },
    { year: 2024, name: '2024年度　進路一覧.xlsx' }
];

files.forEach(f => {
    const filePath = path.join(__dirname, '../', f.name);
    try {
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets['Sheet1'];
        const rows = XLSX.utils.sheet_to_json(ws);
        
        console.log(`\n=== Year ${f.year} Analysis (${rows.length} students) ===`);
        
        let diffCount = 0;
        rows.forEach((row, idx) => {
            const finalSchool = row['最終合格校'] ? String(row['最終合格校']).trim() : '';
            const enrolledSchool = row['進学先'] ? String(row['進学先']).trim() : '';
            
            if (finalSchool !== enrolledSchool) {
                diffCount++;
                if (diffCount <= 10) {
                    console.log(`  Diff ${diffCount}: Student=${row['氏名']}, FinalPass=${finalSchool || '(empty)'}, Enrolled=${enrolledSchool || '(empty)'}`);
                }
            }
        });
        console.log(`Total mismatch count (FinalPass !== Enrolled): ${diffCount}`);
    } catch (e) {
        console.log(`Error reading ${f.name}:`, e.message);
    }
});
