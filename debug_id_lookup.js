
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const MASTER_DIR = 'e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者';
const MASTER_FILES = ['修了者.xlsx', '卒業者.xlsx', '在籍者.xlsx', '退学者.xlsx'];

MASTER_FILES.forEach(file => {
    const filePath = path.join(MASTER_DIR, file);
    try {
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        console.log(`Scanning ${file}...`);
        data.forEach(row => {
            const name = row['氏名'] || row['名前'] || row['Name'];
            const id = row['学籍番号'];
            const nat = row['国籍・地域'] || row['国籍'];

            if (name) {
                // Check for 2017 student "Liu Haoran"
                if (name.includes('劉') && name.includes('浩然')) {
                    console.log(`  [MATCH 2017] Found ${name} in ${file} (ID: ${id}, Nat: ${nat})`);
                }
                // Check for Master student "Wang Ruixiang" (known to exist)
                if (name.includes('王') && name.includes('瑞祥')) {
                    console.log(`  [MATCH CONTROL] Found ${name} in ${file} (ID: ${id}, Nat: ${nat})`);
                }
            }
        });
    } catch (e) {
        console.log(`Error reading ${file}: ${e.message}`);
    }
});
