const XLSX = require('xlsx');
const fs = require('fs');
const path = './src/data/career_stats.json';
const EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    // 1. Read existing career stats
    const rawJson = fs.readFileSync(path, 'utf8');
    const data = JSON.parse(rawJson);

    // 2. Read Excel Data (Real JLPT Scores)
    let realScores = [];
    try {
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheet = workbook.Sheets['歴代受験記録'];
        if (sheet) {
            const rows = XLSX.utils.sheet_to_json(sheet);
            // Headers: 受験回, 学籍番号, 国籍, 氏名, レベル, 得点, 合否...
            // Extract Score and Level
            rows.forEach(row => {
                const level = row['レベル'];
                const score = parseInt(row['得点']);
                const result = row['合否'];

                // Only consider passed or valid scores if desired. The user asked for "Successful Candidates" (合格者) data in Step 224.
                // Assuming "合格" means passed.
                if (level && !isNaN(score) && result && result.includes('合格')) {
                    realScores.push({ level, score });
                }
            });
            console.log(`Loaded ${realScores.length} passed exam records from Excel.`);
        }
    } catch (e) {
        console.warn('Could not read Excel file, falling back to pure random:', e.message);
    }


    if (data.topDestinations) {
        data.topDestinations = data.topDestinations.map(d => {
            return {
                ...d,
                jlptStats: {} // Explicitly empty as per user request (No simulated data)
            };
        });
    }

    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    console.log('Updated career_stats.json: Cleared all partial/simulated JLPT stats.');

} catch (err) {
    console.error(err);
}
