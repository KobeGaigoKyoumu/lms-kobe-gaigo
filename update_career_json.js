const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = './src/data/career_stats_v2.json';
const CAREER_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const JLPT_EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

try {
    fs.writeFileSync('processing_log.txt', 'Starting log\n');
    console.log('Starting Career Stats Update...');

    // 1. Build Student ID -> Destination Map & Destination Yearly Counts
    const studentDestinations = {};
    const destinationYearlyStats = {}; // { DestName: { "2021": count, "2022": count ... } }
    const destinationStudents = {}; // { DestName: [ { year, id, name }... ] }
    const files = fs.readdirSync(CAREER_DIR).filter(f => f.endsWith('.xlsx'));

    console.log(`Found ${files.length} career list files.`);

    const normalizeDestination = (d) => {
        if (!d) return '';
        const name = String(d).replace(/\s+/g, '').trim();

        const mapping = {
            '東亜経理': '東亜経理専門学校',
            '東亜経理専門学校': '東亜経理専門学校',
            '東京国際ビジネスカレッジ': '東京国際ビジネスカレッジ神戸校',
            '東京国際ビジネスカレッジ神戸校': '東京国際ビジネスカレッジ神戸校',
            'アートカレッジ': '専門学校アートカレッジ神戸',
            'アートカレッジ神戸': '専門学校アートカレッジ神戸',
            '専門学校アートカレッジ神戸': '専門学校アートカレッジ神戸',
            '愛甲': '愛甲学院専門学校',
            '愛甲学院': '愛甲学院専門学校',
            '愛甲学院専門学校': '愛甲学院専門学校',
            'ICT': 'ICT専門学校',
            'ICT専門学校': 'ICT専門学校',
            '関西国際旅行ホテル専門学校': '関西国際旅行・ホテル専門学校',
            'トヨタ自動車大学校': 'トヨタ自動車大学校神戸校',
            'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校',
            '大原': '大原簿記専門学校三宮校',
            '大原簿記専門学校三宮校': '大原簿記専門学校三宮校',
            '日本コンピュータ': '日本コンピュータ専門学校',
            '和歌山福祉専門学校': '和歌山社会福祉専門学校',
            '和歌山社会福祉専門学校': '和歌山社会福祉専門学校'
        };

        return mapping[name] || name;
    };

    files.forEach(file => {
        const filePath = path.join(CAREER_DIR, file);
        // Extract year from filename "2023年度..."
        const match = file.match(/^(\d{4})/);
        const year = match ? match[1] : 'Unknown';
        const seenInYear = new Set();

        try {
            const workbook = XLSX.readFile(filePath);

            // Process all sheets
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(row => {
                    const id = row['学籍番号'] || row['No.'] || row['ID'] || row['学生番号'];
                    const dest = row['進学先'] || row['進路先'] || row['就職先'] || row['進学・就職先'] || row['学校名'] || row['企業名'] || row['最終合格校'];
                    const name = row['氏名'] || row['氏 名'] || row['名前'];

                    if (id && dest) {
                        const studentId = String(id).trim();
                        if (seenInYear.has(studentId)) return;
                        seenInYear.add(studentId);

                        const destName = normalizeDestination(dest);
                        // Map student to destination
                        studentDestinations[studentId] = destName;

                        // Aggregate yearly stats
                        if (!destinationYearlyStats[destName]) destinationYearlyStats[destName] = {};
                        if (!destinationYearlyStats[destName][year]) destinationYearlyStats[destName][year] = 0;
                        destinationYearlyStats[destName][year]++;

                        // Collect Student Details
                        if (!destinationStudents[destName]) destinationStudents[destName] = [];
                        if (name) {
                            destinationStudents[destName].push({ year, id, name });
                        }
                    }
                });
            });
            console.log(`Processed ${file} (Year: ${year})`);
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

            rows.forEach((row, idx) => {
                const level = row['レベル'];
                const score = parseInt(row['得点']);
                const result = row['合否'];
                const id = row['学籍番号'];

                // Consider both passed and failed
                // If score exists, include it. If 'result' is missing/empty, assume failed if not '合格'.
                if (level && !isNaN(score) && id) {
                    const studentId = String(id).trim();
                    const destName = studentDestinations[studentId];

                    if (destName) {
                        if (!destinationStats[destName]) destinationStats[destName] = {};
                        if (!destinationStats[destName][level]) {
                            destinationStats[destName][level] = { passed: [], failed: [] };
                        }

                        // Strict check for Pass.
                        if (result === '合格') {
                            destinationStats[destName][level].passed.push(score);
                        } else {
                            destinationStats[destName][level].failed.push(score);
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error('Error reading JLPT Excel:', e.message);
    }

    // 3. Aggregate Stats and Update JSON
    const rawJson = fs.readFileSync(OUTPUT_PATH, 'utf8');
    const data = JSON.parse(rawJson);
    data.generatedAt = new Date().toISOString();

    if (data.topDestinations) {
        data.topDestinations = data.topDestinations.map(d => {
            const destName = normalizeDestination(d.name);
            const statsObj = destinationStats[destName];
            const yearsObj = destinationYearlyStats[destName] || {};

            const jlptStats = {};

            if (statsObj) {
                Object.keys(statsObj).forEach(level => {
                    const { passed, failed } = statsObj[level];

                    const calculateStats = (scores) => {
                        if (scores.length === 0) return null;
                        const sum = scores.reduce((a, b) => a + b, 0);
                        const avg = sum / scores.length;
                        const max = Math.max(...scores);
                        const min = Math.min(...scores);
                        return { count: scores.length, avg: parseFloat(avg.toFixed(1)), max, min };
                    };

                    const passedStats = calculateStats(passed);
                    const failedStats = calculateStats(failed);

                    if (passedStats || failedStats) {
                        jlptStats[level] = {
                            passed: passedStats,
                            failed: failedStats
                        };
                    }
                });
            }

            // Calculate current total count from matched years
            const totalCount = Object.values(yearsObj).reduce((a, b) => a + b, 0);

            return {
                ...d,
                name: destName,
                count: totalCount || d.count, // Update with real total, fallback to existing if no new data found
                years: yearsObj, // Update with real yearly counts
                jlptStats: jlptStats,
                students: destinationStudents[destName] || []
            };
        });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('Updated career_stats_v2.json with REAL linked JLPT data.');

} catch (err) {
    console.error('Fatal Error:', err);
}
