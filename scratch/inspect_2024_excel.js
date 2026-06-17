const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const ws = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        console.log(`Total rows: ${rows.length}`);
        
        // 最初から10行目までを出力してヘッダーを確認
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            if (row && row.length > 0) {
                console.log(`Row ${i}:`, row.slice(0, 15)); // 15列目まで表示
            }
        }
    });

} catch (e) {
    console.error('Error reading excel:', e.message);
}
