import fs from 'fs';
import path from 'path';

// Define the base path for JLPT results
// Using process.cwd() to correctly locate the data directory in Vercel environment
const JLPT_BASE_DIR = path.join(process.cwd(), 'data', 'JLPT結果');

/**
 * Parses a single CSV line into a structured object.
 * Based on observed format:
 * "代表者","2024年第1回日本語能力試験","N2","280121361","NAME","Country","Language","Gender","Result","Score/Total",...
 */
function parseLine(line) {
    // Simple CSV parser handling quoted fields
    const parts = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);

    // Clean quotes
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

    if (cleanParts.length < 10) return null; // Not enough data

    return {
        examName: cleanParts[1],
        level: cleanParts[2],
        id: cleanParts[3],
        name: cleanParts[4],
        country: cleanParts[5],
        result: cleanParts[8], // "合格" or "不合格"
        totalScore: cleanParts[9], // "79/180"
    };
}

export async function getJlptData() {
    try {
        if (!fs.existsSync(JLPT_BASE_DIR)) {
            console.error(`JLPT Directory not found at: ${JLPT_BASE_DIR}`);
            return [];
        }

        const sessions = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const allData = [];

        for (const session of sessions) {
            const sessionDir = path.join(JLPT_BASE_DIR, session);
            const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

            for (const file of files) {
                const filePath = path.join(sessionDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split(/\r?\n/);

                // Skip header usually, check first line content if unsure. 
                // Assuming line 1 is header if it contains "代表者"
                const dataLines = lines.slice(1).filter(l => l.trim().length > 0);

                for (const line of dataLines) {
                    const parsed = parseLine(line);
                    if (parsed) {
                        allData.push({
                            session,
                            ...parsed
                        });
                    }
                }
            }
        }

        return processStatistics(allData);

    } catch (error) {
        console.error("Error reading JLPT data:", error);
        return [];
    }
}

function processStatistics(rawData) {
    // Aggregate data for visualization

    // 1. Pass Rate by Session & Level
    const statsBySession = {};

    rawData.forEach(record => {
        const key = `${record.session}-${record.level}`;
        if (!statsBySession[key]) {
            statsBySession[key] = {
                session: record.session,
                level: record.level,
                total: 0,
                passed: 0,
                totalScoreSum: 0,
                countCheck: 0
            };
        }

        statsBySession[key].total++;
        if (record.result === '合格') {
            statsBySession[key].passed++;
        }

        // Parse score "100/180" -> 100
        const scoreVal = parseInt(record.totalScore.split('/')[0]);
        if (!isNaN(scoreVal)) {
            statsBySession[key].totalScoreSum += scoreVal;
            statsBySession[key].countCheck++;
        }
    });

    const structuredStats = Object.values(statsBySession).map(item => ({
        session: item.session,
        level: item.level,
        passRate: item.total > 0 ? ((item.passed / item.total) * 100).toFixed(1) : 0,
        averageScore: item.countCheck > 0 ? (item.totalScoreSum / item.countCheck).toFixed(1) : 0,
        examinees: item.total,
        passers: item.passed
    }));

    // Sort by session date (approximate)
    // Assumes format "YYYY年第N回". 
    structuredStats.sort((a, b) => {
        const yearA = parseInt(a.session.substring(0, 4));
        const yearB = parseInt(b.session.substring(0, 4));
        if (yearA !== yearB) return yearA - yearB;
        return a.session.localeCompare(b.session);
    });

    return structuredStats;
}
