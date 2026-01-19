import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

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
                const buffer = fs.readFileSync(filePath);
                const content = iconv.decode(buffer, 'Shift_JIS');
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

        // Only count valid results (合格 or 不合格), exclude 欠席 (absent) and other invalid values
        const result = record.result;
        if (result === '合格' || result === '不合格') {
            statsBySession[key].total++;
            if (result === '合格') {
                statsBySession[key].passed++;
            }
        }

        // Parse score "100/180" -> 100
        const scoreVal = parseInt(record.totalScore.split('/')[0]);
        if (!isNaN(scoreVal) && scoreVal > 0) {
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

/**
 * Get all raw JLPT data (for enhanced statistics)
 */
export async function getAllRawJlptData() {
    try {
        if (!fs.existsSync(JLPT_BASE_DIR)) {
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
                const buffer = fs.readFileSync(filePath);
                const content = iconv.decode(buffer, 'Shift_JIS');
                const lines = content.split(/\r?\n/).slice(1).filter(l => l.trim().length > 0);

                for (const line of lines) {
                    const parsed = parseLine(line);
                    if (parsed) {
                        allData.push({ session, ...parsed });
                    }
                }
            }
        }

        return allData;
    } catch (error) {
        console.error("Error reading raw JLPT data:", error);
        return [];
    }
}

/**
 * Get JLPT history for a specific student by name
 * @param {string} studentName - Student's full name
 * @param {string} enrollmentDate - Optional enrollment date (YYYY-MM-DD) to filter records after this date
 */
export async function getJlptByStudentName(studentName, enrollmentDate = null) {
    const allData = await getAllRawJlptData();

    // Filter by student name (exact match, case-insensitive)
    let studentRecords = allData.filter(record =>
        record.name && record.name.toLowerCase() === studentName.toLowerCase()
    );

    // If enrollment date provided, filter to only show exams after enrollment
    if (enrollmentDate) {
        const enrollDate = new Date(enrollmentDate);
        studentRecords = studentRecords.filter(record => {
            // Parse session like "2024年第1回" -> July 2024, "2024年第2回" -> December 2024
            const year = parseInt(record.session.substring(0, 4));
            const isFirstRound = record.session.includes('第1回');
            // 第1回 = July, 第2回 = December
            const examMonth = isFirstRound ? 6 : 11; // 0-indexed (July=6, December=11)
            const examDate = new Date(year, examMonth, 1);
            return examDate >= enrollDate;
        });
    }

    // Sort by session (newest first)
    studentRecords.sort((a, b) => b.session.localeCompare(a.session));

    return studentRecords.map(r => ({
        session: r.session,
        level: r.level,
        result: r.result,
        score: r.totalScore,
        country: r.country
    }));
}

/**
 * Get enhanced statistics (nationality breakdown, level comparison)
 */
export async function getEnhancedJlptStats() {
    const rawData = await getAllRawJlptData();

    // Filter valid results only
    const validData = rawData.filter(r => r.result === '合格' || r.result === '不合格');

    // 1. Nationality breakdown
    const byNationality = {};
    validData.forEach(record => {
        const country = record.country || 'Unknown';
        if (!byNationality[country]) {
            byNationality[country] = { total: 0, passed: 0 };
        }
        byNationality[country].total++;
        if (record.result === '合格') byNationality[country].passed++;
    });

    const nationalityStats = Object.entries(byNationality)
        .map(([country, stats]) => ({
            country,
            total: stats.total,
            passed: stats.passed,
            passRate: ((stats.passed / stats.total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10 countries

    // 2. Level comparison (overall)
    const byLevel = {};
    validData.forEach(record => {
        const level = record.level;
        if (!byLevel[level]) {
            byLevel[level] = { total: 0, passed: 0 };
        }
        byLevel[level].total++;
        if (record.result === '合格') byLevel[level].passed++;
    });

    const levelStats = ['N1', 'N2', 'N3', 'N4', 'N5'].map(level => ({
        level,
        total: byLevel[level]?.total || 0,
        passed: byLevel[level]?.passed || 0,
        passRate: byLevel[level] ? ((byLevel[level].passed / byLevel[level].total) * 100).toFixed(1) : 0
    }));

    // 3. Year-over-year trend
    const byYear = {};
    validData.forEach(record => {
        const year = record.session.substring(0, 4);
        if (!byYear[year]) {
            byYear[year] = { total: 0, passed: 0 };
        }
        byYear[year].total++;
        if (record.result === '合格') byYear[year].passed++;
    });

    const yearlyTrend = Object.entries(byYear)
        .map(([year, stats]) => ({
            year,
            total: stats.total,
            passed: stats.passed,
            passRate: ((stats.passed / stats.total) * 100).toFixed(1)
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

    // 4. N3+ Certification Rate (unique students who passed N1, N2, or N3)
    // This represents students who achieved N3 or higher at any point
    // IMPORTANT: Denominator is ALL examinees (passers + failures), not just passers

    // First, get all unique examinees (excluding absent)
    const allExaminees = new Set();
    const n3PlusAchievers = new Set();

    rawData.forEach(record => {
        const result = record.result;
        if (result !== '合格' && result !== '不合格') return; // Skip absent

        const name = record.name;
        if (!name) return;

        allExaminees.add(name);

        // Track N3+ achievers (students who passed N1, N2, or N3 at any point)
        if (result === '合格') {
            const levelNum = parseInt(record.level.replace('N', ''));
            if (levelNum <= 3) {
                n3PlusAchievers.add(name);
            }
        }
    });

    const n3PlusStudents = n3PlusAchievers.size;
    const totalUniqueStudents = allExaminees.size;

    // Calculate by graduation year
    // JLPT Schedule: 第1回 = July, 第2回 = December
    // Students graduate in March, so exam year X → graduation year X+1 (March)
    // N3+ Rate = students who PASSED N1/N2/N3 / ALL unique examinees (including failures)
    const graduationStats = {};

    // First pass: count ALL examinees (including failures) to get total student count
    rawData.forEach(record => {
        const result = record.result;
        if (result !== '合格' && result !== '不合格') return; // Skip absent/invalid

        const examYear = parseInt(record.session.substring(0, 4));
        const graduationYear = examYear + 1;
        const name = record.name;
        if (!name) return;

        if (!graduationStats[graduationYear]) {
            graduationStats[graduationYear] = { allStudents: new Set(), n3Plus: new Set() };
        }
        graduationStats[graduationYear].allStudents.add(name);

        // Only add to N3+ if they PASSED an N1/N2/N3 exam
        if (result === '合格') {
            const level = record.level;
            const levelNum = parseInt(level.replace('N', ''));
            if (levelNum <= 3) {
                graduationStats[graduationYear].n3Plus.add(name);
            }
        }
    });

    const graduationN3PlusRates = Object.entries(graduationStats)
        .map(([year, stats]) => ({
            year: year + '年3月卒',
            totalStudents: stats.allStudents.size,
            n3PlusStudents: stats.n3Plus.size,
            rate: stats.allStudents.size > 0 ? ((stats.n3Plus.size / stats.allStudents.size) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

    return {
        nationalityStats,
        levelStats,
        yearlyTrend,
        graduationN3PlusRates,
        overallN3PlusRate: {
            totalUniqueStudents,
            n3PlusStudents,
            rate: totalUniqueStudents > 0 ? ((n3PlusStudents / totalUniqueStudents) * 100).toFixed(1) : 0
        }
    };
}


