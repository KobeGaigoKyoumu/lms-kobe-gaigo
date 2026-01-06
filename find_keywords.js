const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'e:\\デスクトップ\\LMS(神戸外語)\\lms-app\\成績評価シート_202502_2-1.xlsm';

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find sheet
    let sheetName = workbook.SheetNames.find(n => n.includes('総合成績') || (n.includes('評価') && !n.includes('シート')));
    if (!sheetName) sheetName = workbook.SheetNames[3];

    console.log(`Searching Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];

    const keywords = ['出席', '平常', '基礎', '合計', '文字', '聴解', '読解', '文法', '作文', '会話'];
    const hits = [];

    for (let R = 0; R <= 10; ++R) {
        for (let C = 0; C <= 100; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
            if (cell) {
                const val = (cell.v || cell.w).toString();
                // Check if any keyword is in the value
                const matched = keywords.some(k => val.includes(k));
                if (matched) {
                    hits.push({ r: R, c: C, val: val });
                }
            }
        }
    }

    console.log('--- Keyword Hits ---');
    hits.forEach(h => {
        console.log(`[R${h.r}, C${h.c}] : ${h.val}`);
    });

} catch (e) {
    console.error(e);
}
