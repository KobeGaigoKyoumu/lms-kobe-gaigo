const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = './src/data/career_stats.json';
const CAREER_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const JLPT_EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    console.log('Starting Career Stats Update...');

    // 1. Build Student ID -> Destination Map
    const studentDestinations = {};
    const files = fs.readdirSync(CAREER_DIR).filter(f => f.endsWith('.xlsx'));

    console.log(`Found ${files.length} career list files.`);

    files.forEach(file => {
        const filePath = path.join(CAREER_DIR, file);
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) return;

            const rows = XLSX.utils.sheet_to_json(sheet);
            rows.forEach(row => {
                const id = row['学籍番号'];
                const dest = row['進学先'];
                if (id && dest) {
                    // Normalize ID if needed (string/number)
                    studentDestinations[String(id).trim()] = dest.trim();
                }
            });
        } catch (e) {
            console.warn(`Error reading ${file}:`, e.message);
        }
    });

    console.log(`Mapped ${Object.keys(studentDestinations).length} students to destinations.`);

    // 2. Read Real JLPT Scores
    const destinationStats = {}; // { DestName: { N1: { counts: [], ... }, ... } }

    try {
        const workbook = XLSX.readFile(JLPT_EXCEL_PATH);
        const sheet = workbook.Sheets['歴代受験記録'];
        if (sheet) {
            const rows = XLSX.utils.sheet_to_json(sheet);

            rows.forEach(row => {
                const level = row['レベル'];
                const score = parseInt(row['得点']);
                const result = row['合否'];
                const id = row['学籍番号'];

                // Only consider passed students
                if (level && !isNaN(score) && result && result.includes('合格') && id) {
                    const studentId = String(id).trim();
                    const destName = studentDestinations[studentId];

                    if (destName) {
                        if (!destinationStats[destName]) destinationStats[destName] = {};
                        if (!destinationStats[destName][level]) {
                            destinationStats[destName][level] = { scores: [] };
                        }
                        destinationStats[destName][level].scores.push(score);
                    }
                }
            });
        }
    } catch (e) {
        console.error('Error reading JLPT Excel:', e.message);
    }

    // 3. Aggregate Stats and Update JSON
    // Read existing JSON to preserve structure (like topDestinations list info if needed, or rebuild it?)
    // The user wants to update the stats. We should match the existing "name" in topDestinations.

    const rawJson = fs.readFileSync(OUTPUT_PATH, 'utf8');
    const data = JSON.parse(rawJson);

    if (data.topDestinations) {
        data.topDestinations = data.topDestinations.map(d => {
            const destName = d.name;
            const statsObj = destinationStats[destName];

            const jlptStats = {};

            if (statsObj) {
                Object.keys(statsObj).forEach(level => {
                    const scores = statsObj[level].scores;
                    if (scores.length > 0) {
                        const sum = scores.reduce((a, b) => a + b, 0);
                        const avg = sum / scores.length;
                        const max = Math.max(...scores);
                        const min = Math.min(...scores);

                        jlptStats[level] = {
                            count: scores.length,
                            avg: parseFloat(avg.toFixed(1)),
                            max: max,
                            min: min
                        };
                    }
                });
            }

            return {
                ...d,
                jlptStats: jlptStats
            };
        });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('Updated career_stats.json with REAL linked JLPT data.');

} catch (err) {
    console.error('Fatal Error:', err);
}
