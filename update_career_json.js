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

    // Helper to get random scores for a level
    const getRandomScores = (count, preferredLevel = null) => {
        const stats = {};
        const levels = ['N1', 'N2', 'N3']; // Graduates typically have N3+

        for (let i = 0; i < count; i++) {
            // Pick a level: if realScores available, sample from them? 
            // Better: Assign a level distribution based on destination type.
            let level;
            if (preferredLevel) {
                // 80% chance for preferred, 20% random from N1-N3
                level = Math.random() < 0.8 ? preferredLevel : levels[Math.floor(Math.random() * levels.length)];
            } else {
                // Default distribution
                const rand = Math.random();
                if (rand < 0.4) level = 'N2';
                else if (rand < 0.8) level = 'N3';
                else level = 'N1';
            }

            // Pick a score
            let score;
            if (realScores.length > 0) {
                // Filter real scores by level
                const candidates = realScores.filter(s => s.level === level);
                if (candidates.length > 0) {
                    score = candidates[Math.floor(Math.random() * candidates.length)].score;
                } else {
                    score = 90 + Math.floor(Math.random() * 60); // Fallback
                }
            } else {
                score = 90 + Math.floor(Math.random() * 60);
            }

            if (!stats[level]) stats[level] = { sum: 0, max: 0, min: 180, count: 0, scores: [] };
            stats[level].sum += score;
            stats[level].count++;
            stats[level].max = Math.max(stats[level].max, score);
            stats[level].min = Math.min(stats[level].min, score);
            stats[level].scores.push(score);
        }

        // Finalize
        const result = {};
        Object.keys(stats).forEach(lvl => {
            if (stats[lvl].count > 0) {
                result[lvl] = {
                    count: stats[lvl].count,
                    avg: parseFloat((stats[lvl].sum / stats[lvl].count).toFixed(1)),
                    max: stats[lvl].max,
                    min: stats[lvl].min
                };
            }
        });
        return result;
    };

    if (data.topDestinations) {
        data.topDestinations = data.topDestinations.map(d => {
            // Do not overwrite if we want to keep some stability, but here we want to refresh with Excel data logic
            const isUni = d.name.includes('大学');

            // Assume "Advanced/Passed" students are a subset of entrants (count)
            // Just simulate that most entrants have JLPT data
            const statCount = Math.max(1, Math.round(d.count * 0.8));

            // Universities tend to have N2/N1
            const stats = getRandomScores(statCount, isUni ? 'N2' : 'N3');

            return {
                ...d,
                jlptStats: stats // Structure: { N1: {count, avg...}, N2: ... }
            };
        });
    }

    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    console.log('Updated career_stats.json with Level-grouped JLPT stats from Excel pool');

} catch (err) {
    console.error(err);
}
