import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

// Define the base path for JLPT results
// Using process.cwd() to correctly locate the data directory in Vercel environment
const JLPT_BASE_DIR = path.join(process.cwd(), 'data', 'JLPT結果');
const JLPT_HISTORICAL_JSON = path.join(process.cwd(), 'data', 'jlpt_historical.json');
const NAME_MAPPINGS_JSON = path.join(process.cwd(), 'data', 'name_mappings.json');
const HISTORICAL_STUDENTS_JSON = path.join(process.cwd(), 'data', 'historical_students.json');

const GRADUATION_STATS_JSON = path.join(process.cwd(), 'data', 'graduation_n3_stats.json');
const ENROLLMENT_STATS_JSON = path.join(process.cwd(), 'data', 'enrollment_stats.json');
const CAREER_STATS_JSON = path.join(process.cwd(), 'src', 'data', 'career_stats_v2.json');
const JLPT_NATIONAL_STATS_JSON = path.join(process.cwd(), 'data', 'jlpt_national_stats.json');

/**
 * Loads national JLPT statistics (average pass rates etc.)
 */
export function getJlptNationalStats() {
    try {
        if (!fs.existsSync(JLPT_NATIONAL_STATS_JSON)) {
            console.warn('National stats file not found:', JLPT_NATIONAL_STATS_JSON);
            return null;
        }
        const content = fs.readFileSync(JLPT_NATIONAL_STATS_JSON, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error loading national stats:', error);
        return null;
    }
}


// Cache for name mappings (kanji <-> romanized)
let nameMappingsCache = null;

/**
 * Loads name mappings for Chinese students (kanji <-> romanized names)
 * Returns a Map where each name variant points to all equivalent names
 */
function loadNameMappings() {
    if (nameMappingsCache) return nameMappingsCache;

    try {
        if (!fs.existsSync(NAME_MAPPINGS_JSON)) {
            nameMappingsCache = new Map();
            return nameMappingsCache;
        }

        const content = fs.readFileSync(NAME_MAPPINGS_JSON, 'utf-8');
        const data = JSON.parse(content);

        nameMappingsCache = new Map();

        if (data.mappings && Array.isArray(data.mappings)) {
            for (const mapping of data.mappings) {
                const kanjiLower = mapping.kanjiName?.toLowerCase()?.trim();
                const romanLower = mapping.romanName?.toLowerCase()?.trim();

                if (kanjiLower && romanLower) {
                    // Map both directions
                    if (!nameMappingsCache.has(kanjiLower)) {
                        nameMappingsCache.set(kanjiLower, new Set([kanjiLower]));
                    }
                    nameMappingsCache.get(kanjiLower).add(romanLower);

                    if (!nameMappingsCache.has(romanLower)) {
                        nameMappingsCache.set(romanLower, new Set([romanLower]));
                    }
                    nameMappingsCache.get(romanLower).add(kanjiLower);
                }
            }
        }

        console.log(`Loaded ${nameMappingsCache.size} name mappings for Chinese students`);
        return nameMappingsCache;
    } catch (error) {
        console.error('Error loading name mappings:', error);
        nameMappingsCache = new Map();
        return nameMappingsCache;
    }
}

/**
 * Gets all equivalent name variants for a given name
 * @param {string} name - The name to look up
 * @returns {Set<string>} - Set of all equivalent names (including original)
 */
function getAllNameVariants(name) {
    const nameMappings = loadNameMappings();
    const nameLower = name?.toLowerCase()?.trim();

    if (!nameLower) return new Set();

    const variants = nameMappings.get(nameLower);
    if (variants) {
        return variants;
    }

    // Return just the original name if no mapping found
    return new Set([nameLower]);
}


/**
 * Loads historical JLPT data from the JSON file (歴代受験結果データベース)
 * This contains student IDs which are not available in the CSV files
 */
function loadHistoricalJlptData() {
    try {
        if (!fs.existsSync(JLPT_HISTORICAL_JSON)) {
            console.log('Historical JLPT JSON not found, skipping...');
            return [];
        }

        const content = fs.readFileSync(JLPT_HISTORICAL_JSON, 'utf-8');
        const data = JSON.parse(content);

        if (!data.records || !Array.isArray(data.records)) {
            return [];
        }

        // Convert to same format as CSV parsing
        return data.records.map(record => ({
            session: record.session,
            examName: `${record.session}日本語能力試験`,
            level: record.level,
            id: record.studentId, // Student ID from Excel
            name: record.name,
            country: record.country,
            result: record.result,
            totalScore: `${record.score}/180`, // Format like CSV
            studentId: record.studentId, // Keep as separate field for matching
            source: 'historical' // Mark as from historical database
        }));
    } catch (error) {
        console.error('Error loading historical JLPT data:', error);
        return [];
    }
}

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

    const level = cleanParts[2];
    const result = {
        examName: cleanParts[1],
        level: level,
        id: cleanParts[3],
        name: cleanParts[4],
        country: cleanParts[5],
        result: cleanParts[8], // "合格" or "不合格"
        totalScore: cleanParts[9], // "79/180"
    };

    // Extract section scores and reference info based on level
    if (level) {
        if (/^N[1-3]$/.test(level)) {
            // N1-N3: 
            // Scores: Knowledge(12), Reading(14), Listening(16)
            // Reference: Vocab(22), Grammar(24)
            result.sectionScores = {
                knowledge: cleanParts[12],
                reading: cleanParts[14],
                listening: cleanParts[16]
            };
            result.referenceInfo = {
                vocabulary: { grade: cleanParts[22], name: cleanParts[21] }, // 文字・語彙
                grammar: { grade: cleanParts[24], name: cleanParts[23] }     // 文法
            };
        } else if (/^N[4-5]$/.test(level)) {
            // N4-N5: 
            // Scores: Knowledge & Reading(12), Listening(14)
            // Reference: Vocab(22), Grammar(24) - Need to verify if N4/N5 has this. 
            // Assuming structure is consistent enough or we check content.
            result.sectionScores = {
                knowledge: cleanParts[12], // 言語知識・読解
                reading: '-',              // Combined in knowledge
                listening: cleanParts[14]
            };
            result.referenceInfo = {
                vocabulary: { grade: cleanParts[22], name: cleanParts[21] },
                grammar: { grade: cleanParts[24], name: cleanParts[23] }
            };
        }
    }

    return result;
}

export async function getJlptData() {
    try {
        // Use the combined data source (CSV + Historical JSON)
        const allData = await getAllRawJlptData();
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
 * Combines data from historical JSON (with student IDs) and CSV files
 * Priority: JSON data is preferred as it has complete student ID information
 */
export async function getAllRawJlptData() {
    try {
        // Check for CSV data directories
        let csvSessions = new Set();
        if (fs.existsSync(JLPT_BASE_DIR)) {
            const dirs = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            csvSessions = new Set(dirs);
        }

        // First, load historical data from JSON (has student IDs)
        // BUT ignore sessions that strictly exist in CSV folders (prefer CSV data)
        const historicalData = loadHistoricalJlptData().filter(record => !csvSessions.has(record.session));
        console.log(`Loaded ${historicalData.length} records from historical JSON (filtered by CSV availability)`);

        // Create sets to track seen records (avoid duplicates)
        const seenIds = new Set();
        const seenNames = new Set();

        historicalData.forEach(record => {
            if (record.studentId) {
                seenIds.add(`${record.session}|${record.studentId}`);
            }
            // Create unique key: session + name (normalized)
            const key = `${record.session}|${record.name?.toLowerCase()?.trim()}|${record.level}`;
            seenNames.add(key);
        });

        const allData = [...historicalData];

        // Then load CSV data
        if (csvSessions.size > 0) {
            const sessions = Array.from(csvSessions);

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
                            // Check if this record already exists in historical data
                            let isDuplicate = false;

                            // Check by ID first if available
                            if (parsed.id) {
                                const idKey = `${session}|${parsed.id}`;
                                if (seenIds.has(idKey)) {
                                    isDuplicate = true;
                                } else {
                                    seenIds.add(idKey);
                                }
                            }

                            // If not duplicate by ID, check by name
                            if (!isDuplicate) {
                                const nameKey = `${session}|${parsed.name?.toLowerCase()?.trim()}|${parsed.level}`;
                                if (seenNames.has(nameKey)) {
                                    isDuplicate = true;
                                } else {
                                    seenNames.add(nameKey);
                                }
                            }

                            if (!isDuplicate) {
                                allData.push({ session, ...parsed, source: 'csv' });
                            }
                        }
                    }
                }
            }
        }

        console.log(`Total JLPT records: ${allData.length}`);
        return allData;
    } catch (error) {
        console.error("Error reading raw JLPT data:", error);
        return [];
    }
}


/**
 * Get JLPT history for a specific student by name
 * Supports Chinese students with both kanji and romanized names
 * @param {string} studentName - Student's full name
 * @param {string} enrollmentDate - Optional enrollment date (YYYY-MM-DD) to filter records after this date
 */
export async function getJlptByStudentName(studentName, enrollmentDate = null) {
    const allData = await getAllRawJlptData();

    // Get all name variants (for Chinese students with kanji/romanized names)
    const nameVariants = getAllNameVariants(studentName);

    // Filter by student name (matches any name variant)
    let studentRecords = allData.filter(record => {
        if (!record.name) return false;
        const recordNameLower = record.name.toLowerCase().trim();
        return nameVariants.has(recordNameLower);
    });

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
        sectionScores: r.sectionScores || null,
        referenceInfo: r.referenceInfo || null,
        country: r.country,
        studentId: r.studentId || null
    }));
}

/**
 * Get JLPT history for a specific student by student ID (学籍番号)
 * @param {string} studentId - Student's ID number
 * @param {string} enrollmentDate - Optional enrollment date (YYYY-MM-DD) to filter records after this date
 */
export async function getJlptByStudentId(studentId, enrollmentDate = null) {
    const allData = await getAllRawJlptData();

    // Filter by student ID (from historical data)
    let studentRecords = allData.filter(record =>
        record.studentId && record.studentId === String(studentId).trim()
    );

    // If enrollment date provided, filter to only show exams after enrollment
    if (enrollmentDate) {
        const enrollDate = new Date(enrollmentDate);
        studentRecords = studentRecords.filter(record => {
            const year = parseInt(record.session.substring(0, 4));
            const isFirstRound = record.session.includes('第1回');
            const examMonth = isFirstRound ? 6 : 11;
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
        sectionScores: r.sectionScores || null,
        referenceInfo: r.referenceInfo || null,
        country: r.country,
        name: r.name
    }));
}
/**
 * Parse student ID to get enrollment year
 * 
 * Student ID formats:
 * 1. New format (2019~): YYMMXXX (7 digits)
 *    - YY: Enrollment year (20xx)
 *    - MM: Enrollment month (04=April, 07=July, 10=October)
 *    - XXX: Student number
 *    - Example: 2404001 = 2024年4月入学
 * 
 * 2. Old format (2017-2018): Uses Japanese era year
 *    - 7 digits: YYMMXXX where YY = era year (29=H29=2017, 30=H30=2018, 31=H31=2019)
 *    - Example: 2904001 = 平成29年4月入学 = 2017年4月入学
 *    - Example: 3004001 = 平成30年4月入学 = 2018年4月入学
 * 
 * 3. Old format (2016): 6 digits
 *    - 28xxxx = 2016年入学
 *    - 16xxxxx = 2016年入学
 * 
 * @param {string} studentId 
 * @param {string} firstExamSession - Optional: first exam session for fallback (e.g., "2017_1")
 * @returns {{ enrollmentYear: number, enrollmentMonth: number, graduationYear: number } | null}
 */
function parseStudentIdForEnrollment(studentId, firstExamSession = null) {
    if (!studentId) return null;

    const idStr = String(studentId).trim();

    // 6-digit format (2016 and earlier)
    if (idStr.length === 6) {
        const prefix = idStr.substring(0, 2);

        // 28xxxx = 2016年入学
        if (prefix === '28') {
            return {
                enrollmentYear: 2016,
                enrollmentMonth: 4, // Default to April
                graduationYear: 2018
            };
        }
        // 29xxxx (6 digits) = 2017年入学 (rare)
        if (prefix === '29') {
            return {
                enrollmentYear: 2017,
                enrollmentMonth: 4,
                graduationYear: 2019
            };
        }

        return null; // Unknown 6-digit format
    }

    // 7-digit format
    if (idStr.length === 7) {
        const prefix = idStr.substring(0, 2);
        const monthPart = parseInt(idStr.substring(2, 4), 10);

        // Validate month
        const month = (monthPart >= 1 && monthPart <= 12) ? monthPart : 4;

        // Old format: Era year (Heisei 29-31 = 2017-2019)
        // These were used before switching to Western year format
        if (prefix === '29') {
            // 平成29年 = 2017年
            return {
                enrollmentYear: 2017,
                enrollmentMonth: month,
                graduationYear: 2019
            };
        }
        if (prefix === '30') {
            // 平成30年 = 2018年
            return {
                enrollmentYear: 2018,
                enrollmentMonth: month,
                graduationYear: 2020
            };
        }
        if (prefix === '31') {
            // 平成31年/令和元年 = 2019年
            return {
                enrollmentYear: 2019,
                enrollmentMonth: month,
                graduationYear: 2021
            };
        }
        if (prefix === '16') {
            // 2016年入学
            return {
                enrollmentYear: 2016,
                enrollmentMonth: month,
                graduationYear: 2018
            };
        }

        // New format: Western year (19=2019, 20=2020, 21=2021, ...)
        const yearShort = parseInt(prefix, 10);
        if (!isNaN(yearShort) && yearShort >= 19 && yearShort <= 30) {
            const enrollmentYear = 2000 + yearShort;

            // Special Case: 2501 (Jan 2025) -> March 2026 Grad (1.3 years)
            if (prefix === '25' && monthPart === 1) {
                return {
                    enrollmentYear,
                    enrollmentMonth: month,
                    graduationYear: 2026
                };
            }

            // Standard 2-year calculation
            return {
                enrollmentYear,
                enrollmentMonth: month,
                graduationYear: enrollmentYear + 2
            };
        }
    }

    // Fallback: Try to estimate from first exam session
    if (firstExamSession) {
        const parts = firstExamSession.split('_');
        if (parts.length === 2) {
            const examYear = parseInt(parts[0], 10);
            if (!isNaN(examYear)) {
                // First exam is usually in 1st year
                // 7月（第1回）受験 → 同年4月入学
                // 12月（第2回）受験 → 同年4月または10月入学
                return {
                    enrollmentYear: examYear,
                    enrollmentMonth: 4,
                    graduationYear: examYear + 2
                };
            }
        }
    }

    return null;
}




/**
 * Get enhanced statistics (nationality breakdown, level comparison)
 * Uses student IDs for accurate enrollment/graduation year calculation
 * @param {Array} students - Optional list of students with enrollment info for filtering
 */
export async function getEnhancedJlptStats(students = []) {
    const rawData = await getAllRawJlptData();

    // Filter valid results only
    const validData = rawData.filter(r => r.result === '合格' || r.result === '不合格');

    // Create map of student name -> enrollment info
    // Also create studentId -> enrollment info map
    const studentMap = new Map();
    const studentIdMap = new Map();

    if (students && students.length > 0) {
        students.forEach(s => {
            if (s.full_name && s.enrollment_date) {
                const enrollDate = new Date(s.enrollment_date);
                studentMap.set(s.full_name.toLowerCase(), enrollDate);

                // Also add name variants (for Chinese students)
                const variants = getAllNameVariants(s.full_name);
                variants.forEach(variant => {
                    if (!studentMap.has(variant)) {
                        studentMap.set(variant, enrollDate);
                    }
                });
            }
            // Store by student ID if available
            const sid = s.student_id_text || s.student_id;
            if (sid) {
                const parsed = parseStudentIdForEnrollment(sid);
                if (parsed) {
                    studentIdMap.set(String(sid), {
                        enrollmentYear: parsed.enrollmentYear,
                        enrollmentMonth: parsed.enrollmentMonth,
                        graduationYear: parsed.graduationYear,
                        name: s.full_name
                    });
                }
            }
        });
    }

    // Build studentId -> enrollment info from historical data (for students not in Supabase)
    rawData.forEach(record => {
        if (record.studentId && !studentIdMap.has(String(record.studentId))) {
            const parsed = parseStudentIdForEnrollment(record.studentId);
            if (parsed) {
                studentIdMap.set(String(record.studentId), {
                    enrollmentYear: parsed.enrollmentYear,
                    enrollmentMonth: parsed.enrollmentMonth,
                    graduationYear: parsed.graduationYear,
                    name: record.name
                });
            }
        }
    });

    console.log(`Student map size: ${studentMap.size}, StudentId map size: ${studentIdMap.size}`);


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
        .sort((a, b) => parseFloat(b.passRate) - parseFloat(a.passRate));

    // 2. Level breakdown
    const byLevel = {};
    validData.forEach(record => {
        const level = record.level;
        if (!byLevel[level]) {
            byLevel[level] = { total: 0, passed: 0, scoreSum: 0, scoreCount: 0 };
        }
        byLevel[level].total++;
        if (record.result === '合格') byLevel[level].passed++;

        const scoreVal = parseInt(record.totalScore?.split('/')[0]);
        if (!isNaN(scoreVal) && scoreVal > 0) {
            byLevel[level].scoreSum += scoreVal;
            byLevel[level].scoreCount++;
        }
    });

    const levelStats = Object.entries(byLevel)
        .map(([level, stats]) => ({
            level,
            total: stats.total,
            passers: stats.passed,
            passRate: ((stats.passed / stats.total) * 100).toFixed(1),
            avgScore: stats.scoreCount > 0 ? (stats.scoreSum / stats.scoreCount).toFixed(1) : 0
        }))
        .sort((a, b) => a.level.localeCompare(b.level));



    // 3. Yearly Trend (Pass Rate)
    // 3. Yearly Trend (Pass Rate)
    const byYear = {};
    validData.forEach(record => {
        const year = record.session.substring(0, 4);
        if (!byYear[year]) {
            byYear[year] = {
                total: 0, // Total sessions (for pass rate calc)
                passed: 0, // Total passed sessions
                unique_students: new Set() // For Calculate Exam Rate
            };
        }
        byYear[year].total++;
        if (record.studentId) {
            byYear[year].unique_students.add(String(record.studentId));
        } else {
            // If no ID, use name + country as unique key (without level to avoid double counting)
            const key = `${record.name}:${record.country}`;
            byYear[year].unique_students.add(key);
        }

        if (record.result === '合格') byYear[year].passed++;
    });

    // Calculate enrollment by year for Exam Rate
    const enrollmentByYear = {};
    const dynamicEnrollment = {};

    // Load static data safely
    let staticEnrollmentStats = {};
    try {
        if (fs.existsSync(ENROLLMENT_STATS_JSON)) {
            staticEnrollmentStats = JSON.parse(fs.readFileSync(ENROLLMENT_STATS_JSON, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load enrollment stats:', e);
    }

    const processedStudentIds = new Set();

    const addEnrollment = (enrollYear) => {
        if (enrollYear > 0) {
            // Assume 2 year course
            const y1 = enrollYear;
            const y2 = enrollYear + 1;
            dynamicEnrollment[y1] = (dynamicEnrollment[y1] || 0) + 1;
            dynamicEnrollment[y2] = (dynamicEnrollment[y2] || 0) + 1;
        }
    };

    // 1. From active student list
    if (students && students.length > 0) {
        students.forEach(s => {
            // Some checks for valid ID
            const sid = s.student_id_text || s.student_id;
            if (sid) processedStudentIds.add(sid);

            let enrollYear = 0;
            if (s.enrollment_date) {
                enrollYear = new Date(s.enrollment_date).getFullYear();
            } else if (sid) {
                const parsed = parseStudentIdForEnrollment(sid);
                if (parsed) enrollYear = parsed.enrollmentYear;
            }
            addEnrollment(enrollYear);
        });
    }

    // 2. From historical exam data (find students not in current master)
    rawData.forEach(record => {
        const sid = record.studentId || record.id; // handle different field names
        if (sid && !processedStudentIds.has(sid)) {
            processedStudentIds.add(sid);
            const parsed = parseStudentIdForEnrollment(sid);
            if (parsed) {
                addEnrollment(parsed.enrollmentYear);
            }
        }
    });

    // Merge static and dynamic enrollment stats
    // Static now contains objects: {total, first_year, second_year}
    // PRIORITY: Use static data when available, dynamic only as fallback for missing years
    const allYears = new Set([...Object.keys(staticEnrollmentStats), ...Object.keys(dynamicEnrollment)]);
    allYears.forEach(year => {
        const staticData = staticEnrollmentStats[year];

        if (staticData && typeof staticData === 'object' && staticData.total > 0) {
            // Use static data (from enrollment_stats.json) - most accurate
            enrollmentByYear[year] = {
                total: staticData.total,
                first_year: staticData.first_year || 0,
                second_year: staticData.second_year || 0
            };
        } else if (staticData && typeof staticData === 'number' && staticData > 0) {
            // Legacy format (simple number)
            enrollmentByYear[year] = {
                total: staticData,
                first_year: 0,
                second_year: 0
            };
        } else {
            // Fallback to dynamic calculation only if no static data
            const dynamicCount = dynamicEnrollment[year] || 0;
            if (dynamicCount > 0) {
                enrollmentByYear[year] = {
                    total: dynamicCount,
                    first_year: 0,
                    second_year: 0
                };
            }
        }
    });

    const yearlyTrend = Object.entries(byYear)
        .map(([year, stats]) => {
            const yearNum = parseInt(year);
            const enrollData = enrollmentByYear[yearNum] || { total: 0, first_year: 0, second_year: 0 };
            const enrolled = typeof enrollData === 'object' ? enrollData.total : enrollData;
            const firstYearEnrolled = typeof enrollData === 'object' ? enrollData.first_year : 0;
            const secondYearEnrolled = typeof enrollData === 'object' ? enrollData.second_year : 0;

            // For Exam Rate: Use UNIQUE examinees / Enrolled (capped at 100%)
            const uniqueExaminees = stats.unique_students ? stats.unique_students.size : stats.total;
            const rawExamRate = enrolled > 0 ? (uniqueExaminees / enrolled) * 100 : 0;
            const examRate = Math.min(rawExamRate, 100).toFixed(1); // Cap at 100%

            return {
                year,
                passRate: ((stats.passed / stats.total) * 100).toFixed(1),
                examinees: uniqueExaminees, // Display unique examinees count
                totalSessions: stats.total, // Keep total sessions if needed elsewhere
                enrolled,
                firstYearEnrolled,
                secondYearEnrolled,
                examRate
            };
        })
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

        // Check if student exists and if this exam is before their enrollment
        let isPreEnrollmentData = false;
        const examYear = parseInt(record.session.substring(0, 4));
        const isFirstRound = record.session.includes('第1回');
        const examMonth = isFirstRound ? 6 : 11;
        const examDate = new Date(examYear, examMonth, 1);

        // Priority 1: Use student ID for accurate enrollment check
        if (record.studentId && studentIdMap.has(String(record.studentId))) {
            const idInfo = studentIdMap.get(String(record.studentId));
            const enrollDate = new Date(idInfo.enrollmentYear, idInfo.enrollmentMonth - 1, 1);

            if (examDate < enrollDate) {
                isPreEnrollmentData = true;
            }
        }
        // Priority 2: Use name matching (with variants for Chinese students)
        else {
            const nameVariants = getAllNameVariants(name);
            for (const variant of nameVariants) {
                if (studentMap.has(variant)) {
                    const enrollDate = studentMap.get(variant);
                    const diffTime = examDate - enrollDate;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        isPreEnrollmentData = true;
                    }
                    break;
                }
            }
        }

        if (isPreEnrollmentData) return; // SKIP pre-enrollment data

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

    // Calculate by graduation year cohort
    // For a 2-year school: student's graduation year = enrollment year + 2
    // We group students by Graduation Year.

    const studentExamHistory = {};

    rawData.forEach(record => {
        const result = record.result;
        if (result !== '合格' && result !== '不合格') return; // Skip absent

        const name = record.name;
        if (!name) return;

        let gradYear = 0;
        const examYear = parseInt(record.session.substring(0, 4));
        let isFirstYearData = false;
        let foundEnrollment = false;

        // Priority 1: Use student ID to get accurate enrollment/graduation year
        if (record.studentId && studentIdMap.has(String(record.studentId))) {
            const idInfo = studentIdMap.get(String(record.studentId));
            gradYear = idInfo.graduationYear;
            foundEnrollment = true;

            // Check if exam is before enrollment (existing logic)
            const isFirstRound = record.session.includes('第1回');
            const examMonth = isFirstRound ? 6 : 11;
            const examDate = new Date(examYear, examMonth, 1);
            const enrollDate = new Date(idInfo.enrollmentYear, idInfo.enrollmentMonth - 1, 1);

            if (examDate < enrollDate) {
                isFirstYearData = true;
            }
        }

        // Priority 2: Use name matching (with variants for Chinese students)
        if (!foundEnrollment) {
            const nameVariants = getAllNameVariants(name);
            for (const variant of nameVariants) {
                if (studentMap.has(variant)) {
                    const enrollDate = studentMap.get(variant);
                    gradYear = enrollDate.getFullYear() + 2;
                    foundEnrollment = true;

                    // Check if 1st year data
                    const isFirstRound = record.session.includes('第1回');
                    const examMonth = isFirstRound ? 6 : 11;
                    const examDate = new Date(examYear, examMonth, 1);

                    const diffTime = examDate - enrollDate;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) isFirstYearData = true;
                    break;
                }
            }
        }

        // Priority 3: Fallback - derive from student ID in historical data
        if (!foundEnrollment && record.studentId) {
            const parsed = parseStudentIdForEnrollment(record.studentId);
            if (parsed) {
                gradYear = parsed.graduationYear;
                foundEnrollment = true;
            }
        }

        // Priority 4: Last resort - estimate from exam year
        if (!foundEnrollment) {
            // DISABLED: User confirmed we should heavily rely on Student ID (2024 enrollees).
            // Estimation creates massive false positives for students without IDs in CSV.
            // gradYear = examYear + 1;
            // debugReason = 'Estimated_From_Exam_Year';
        }

        if (isFirstYearData) return; // SKIP pre-enrollment data

        // If we still don't have a graduation year, skipping this student for the graduation stats
        if (!gradYear) return;

        if (!studentExamHistory[name]) {
            const isKanjiCountry = ['中国', '台湾', '韓国'].includes(record.country);
            studentExamHistory[name] = {
                graduationYear: gradYear,
                hasN3Plus: false,
                isKanjiCountry,
                studentId: record.studentId || null
            };
        } else {
            // Update graduation year if we found better info
            // Priority: ID > Name > Estimate
            // If current is Estimate and new is ID/Name, update.
            // If current is Name and new is ID, update.
            // Simplified Upgrade Logic: Just prioritize ID.
            if (record.studentId && !studentExamHistory[name].studentId) {
                studentExamHistory[name].graduationYear = gradYear;
                studentExamHistory[name].studentId = record.studentId;
            }
        }

        if (result === '合格') {
            const levelNum = parseInt(record.level.replace('N', ''));
            if (levelNum <= 3) {
                studentExamHistory[name].hasN3Plus = true;
            }
        }
    });

    // Group stats
    const graduationCohorts = {};

    Object.entries(studentExamHistory).forEach(([name, data]) => {
        const gradYear = data.graduationYear;

        if (!graduationCohorts[gradYear]) {
            graduationCohorts[gradYear] = {
                total: 0,
                n3Plus: 0,
                kanjiTotal: 0,
                kanjiN3Plus: 0,
                nonKanjiTotal: 0,
                nonKanjiN3Plus: 0
            };
        }

        graduationCohorts[gradYear].total++;
        if (data.isKanjiCountry) {
            graduationCohorts[gradYear].kanjiTotal++;
        } else {
            graduationCohorts[gradYear].nonKanjiTotal++;
        }

        if (data.hasN3Plus) {
            graduationCohorts[gradYear].n3Plus++;
            if (data.isKanjiCountry) {
                graduationCohorts[gradYear].kanjiN3Plus++;
            } else {
                graduationCohorts[gradYear].nonKanjiN3Plus++;
            }
        }
    });

    const graduationN3PlusRates = Object.entries(graduationCohorts)
        .map(([year, stats]) => ({
            year: year + '年3月卒',
            totalStudents: stats.total,
            n3PlusStudents: stats.n3Plus,
            rate: stats.total > 0 ? ((stats.n3Plus / stats.total) * 100).toFixed(1) : 0,
            kanjiRate: stats.kanjiTotal > 0 ? ((stats.kanjiN3Plus / stats.kanjiTotal) * 100).toFixed(1) : '-',
            nonKanjiRate: stats.nonKanjiTotal > 0 ? ((stats.nonKanjiN3Plus / stats.nonKanjiTotal) * 100).toFixed(1) : '-',
            // Detailed stats for JSON generation
            kanji_stats: {
                total: stats.kanjiTotal,
                n3_plus: stats.kanjiN3Plus,
                rate: stats.kanjiTotal > 0 ? (stats.kanjiN3Plus / stats.kanjiTotal) * 100 : 0
            },
            non_kanji_stats: {
                total: stats.nonKanjiTotal,
                n3_plus: stats.nonKanjiN3Plus,
                rate: stats.nonKanjiTotal > 0 ? (stats.nonKanjiN3Plus / stats.nonKanjiTotal) * 100 : 0
            }
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

    // 5. Session-by-session statistics
    const bySession = {};
    validData.forEach(record => {
        const session = record.session;
        if (!bySession[session]) {
            bySession[session] = { session, total: 0, passed: 0, levels: {} };
        }
        bySession[session].total++;
        if (record.result === '合格') bySession[session].passed++;
        
        const lvl = record.level;
        if (!bySession[session].levels[lvl]) {
            bySession[session].levels[lvl] = { total: 0, passed: 0, scoreSum: 0, scoreCount: 0 };
        }
        bySession[session].levels[lvl].total++;
        if (record.result === '合格') bySession[session].levels[lvl].passed++;

        const scoreVal = parseInt(record.totalScore?.split('/')[0]);
        if (!isNaN(scoreVal) && scoreVal > 0) {
            bySession[session].levels[lvl].scoreSum += scoreVal;
            bySession[session].levels[lvl].scoreCount++;
        }
    });

    const sessionStats = Object.values(bySession)
        .map(s => ({
            session: s.session,
            totalExaminees: s.total,
            totalPassers: s.passed,
            passRate: s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : 0,
            items: Object.entries(s.levels).map(([lvl, stats]) => ({
                level: lvl,
                examinees: stats.total,
                passers: stats.passed,
                passRate: stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0,
                averageScore: stats.scoreCount > 0 ? (stats.scoreSum / stats.scoreCount).toFixed(1) : 0
            })).sort((a, b) => {
                const levelOrder = { N1: 1, N2: 2, N3: 3, N4: 4, N5: 5 };
                return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
            })
        }))
        .sort((a, b) => b.session.localeCompare(a.session));



    // 6. Subject-specific scores (言語知識, 読解, 聴解)

    const subjects = {
        knowledge: { total: 0, count: 0, max: 0, min: 60, passedTotal: 0, passedCount: 0, failedTotal: 0, failedCount: 0 },
        reading: { total: 0, count: 0, max: 0, min: 60, passedTotal: 0, passedCount: 0, failedTotal: 0, failedCount: 0 },
        listening: { total: 0, count: 0, max: 0, min: 60, passedTotal: 0, passedCount: 0, failedTotal: 0, failedCount: 0 }
    };

    const levelSubjects = {}; // N1: { knowledge: { total: 0, count: 0 }, ... }

    validData.forEach(record => {
        const lvl = record.level;
        if (!levelSubjects[lvl]) {
            levelSubjects[lvl] = {
                knowledge: { total: 0, count: 0 },
                reading: { total: 0, count: 0 },
                listening: { total: 0, count: 0 }
            };
        }

        const addScore = (subjKey, scoreStr) => {
            if (!scoreStr) return;
            const score = parseInt(scoreStr.split('/')[0]);
            if (isNaN(score)) return;

            const s = subjects[subjKey];
            s.total += score;
            s.count++;
            s.max = Math.max(s.max, score);
            s.min = Math.min(s.min, score);
            if (record.result === '合格') {
                s.passedTotal += score;
                s.passedCount++;
            } else {
                s.failedTotal += score;
                s.failedCount++;
            }

            levelSubjects[lvl][subjKey].total += score;
            levelSubjects[lvl][subjKey].count++;
        };

        if (/^N[1-3]$/.test(lvl) && record.sectionScores) {
            addScore('knowledge', record.sectionScores.knowledge);
            addScore('reading', record.sectionScores.reading);
            addScore('listening', record.sectionScores.listening);
        } else if (/^N[4-5]$/.test(lvl) && record.sectionScores) {
            // N4-N5: Knowledge and Reading are combined in record.sectionScores.knowledge_reading
            // For analysis, we'll put it in knowledge or reading?
            // Usually, these are 120 points total (N4/N5 Knowledge + Reading)
            // Let's skip them for the 3-way breakdown or handle separately if needed.
            // But to match the UI which likely wants 3 columns, we skip or use placeholders.
            addScore('listening', record.sectionScores.listening);
        }
    });

    const subjectStats = {
        totalRecords: validData.length,
        averages: {
            knowledge: subjects.knowledge.count > 0 ? (subjects.knowledge.total / subjects.knowledge.count).toFixed(1) : 0,
            reading: subjects.reading.count > 0 ? (subjects.reading.total / subjects.reading.count).toFixed(1) : 0,
            listening: subjects.listening.count > 0 ? (subjects.listening.total / subjects.listening.count).toFixed(1) : 0
        },
        byLevel: Object.entries(levelSubjects).map(([level, data]) => ({
            level,
            knowledge: data.knowledge.count > 0 ? (data.knowledge.total / data.knowledge.count).toFixed(1) : 0,
            reading: data.reading.count > 0 ? (data.reading.total / data.reading.count).toFixed(1) : 0,
            listening: data.listening.count > 0 ? (data.listening.total / data.listening.count).toFixed(1) : 0
        })).sort((a, b) => a.level.localeCompare(b.level)),
        details: [
            {
                name: '言語知識',
                total: subjects.knowledge.count,
                avg: subjects.knowledge.count > 0 ? (subjects.knowledge.total / subjects.knowledge.count).toFixed(1) : 0,
                max: subjects.knowledge.max,
                min: subjects.knowledge.min === 60 ? 0 : subjects.knowledge.min,
                passAvg: subjects.knowledge.passedCount > 0 ? (subjects.knowledge.passedTotal / subjects.knowledge.passedCount).toFixed(1) : 0,
                failAvg: subjects.knowledge.failedCount > 0 ? (subjects.knowledge.failedTotal / subjects.knowledge.failedCount).toFixed(1) : 0
            },
            {
                name: '読解',
                total: subjects.reading.count,
                avg: subjects.reading.count > 0 ? (subjects.reading.total / subjects.reading.count).toFixed(1) : 0,
                max: subjects.reading.max,
                min: subjects.reading.min === 60 ? 0 : subjects.reading.min,
                passAvg: subjects.reading.passedCount > 0 ? (subjects.reading.passedTotal / subjects.reading.passedCount).toFixed(1) : 0,
                failAvg: subjects.reading.failedCount > 0 ? (subjects.reading.failedTotal / subjects.reading.failedCount).toFixed(1) : 0
            },
            {
                name: '聴解',
                total: subjects.listening.count,
                avg: subjects.listening.count > 0 ? (subjects.listening.total / subjects.listening.count).toFixed(1) : 0,
                max: subjects.listening.max,
                min: subjects.listening.min === 60 ? 0 : subjects.listening.min,
                passAvg: subjects.listening.passedCount > 0 ? (subjects.listening.passedTotal / subjects.listening.passedCount).toFixed(1) : 0,
                failAvg: subjects.listening.failedCount > 0 ? (subjects.listening.failedTotal / subjects.listening.failedCount).toFixed(1) : 0
            }
        ]
    };

    return {
        nationalityStats,
        levelStats,
        yearlyTrend,
        graduationN3PlusRates,
        sessionStats,
        subjectStats,
        overallN3PlusRate: {

            totalUniqueStudents,
            n3PlusStudents,
            rate: totalUniqueStudents > 0 ? ((n3PlusStudents / totalUniqueStudents) * 100).toFixed(1) : 0
        },
        allStudentStats: [] // Placeholder, can be populated if needed
    };

}

/**
 * Load pre-calculated graduation N3+ statistics from official school data
 * This uses the actual graduate list to provide accurate statistics
 * @returns {{ graduation_stats: Array, summary: Object }}
 */
export function getGraduationN3Stats() {
    try {
        if (!fs.existsSync(GRADUATION_STATS_JSON)) {
            console.warn('Graduation stats file not found:', GRADUATION_STATS_JSON);
            return null;
        }

        const content = fs.readFileSync(GRADUATION_STATS_JSON, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error loading graduation N3 stats:', error);
        return null;
    }
}

/**
 * Load historical student data (graduates, dropouts, completers)
 * @returns {{ students: Array }}
 */
export function getHistoricalStudents() {
    try {
        if (!fs.existsSync(HISTORICAL_STUDENTS_JSON)) {
            console.warn('Historical students file not found:', HISTORICAL_STUDENTS_JSON);
            return null;
        }

        const content = fs.readFileSync(HISTORICAL_STUDENTS_JSON, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error loading historical students:', error);
        return null;
    }
}

/**
 * Get accurate graduation year N3+ rates from official school data
 * Falls back to calculated data if official data not available
 */
export async function getAccurateGraduationStats() {
    // First try to get pre-calculated stats from official data
    const officialStats = getGraduationN3Stats();

    if (officialStats && officialStats.graduation_stats) {
        return {
            source: 'official',
            stats: officialStats.graduation_stats.map(s => ({
                year: s.year,
                totalStudents: s.total,
                n3PlusStudents: s.n3_plus,
                rate: s.rate.toFixed(1),
                matchRate: s.match_rate.toFixed(1),
                kanji_stats: s.kanji_stats,
                non_kanji_stats: s.non_kanji_stats
            })),
            summary: officialStats.summary
        };
    }

    // Fallback to calculated stats
    const calculated = await getEnhancedJlptStats([]);
    return {
        source: 'calculated',
        stats: calculated.graduationN3PlusRates,
        summary: calculated.overallN3PlusRate
    };
}

/**
 * Get summary of JLPT status for a list of students
 * Used for class-based analytics
 * @param {Array} students - List of students from DB (must include student_id_text, full_name)
 */
export async function getStudentsJlptSummary(students) {
    const rawData = await getAllRawJlptData();

    // Create lookups for faster matching
    const studentResults = new Map(); // studentId|name -> []

    // Helper to add result to map
    const addResult = (key, record) => {
        if (!key) return;
        if (!studentResults.has(key)) {
            studentResults.set(key, []);
        }
        studentResults.get(key).push(record);
    };

    const normalizeBasic = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/[\s\u3000]/g, '').trim();
    };

    const normalizeSorted = (str) => {
        if (!str) return '';
        const parts = str.toLowerCase().replace(/\u3000/g, ' ').split(/\s+/).filter(Boolean);
        if (parts.length <= 1) return parts[0] || '';
        return parts.sort().join('');
    };

    rawData.forEach(record => {
        if (record.studentId) {
            addResult(String(record.studentId), record);
        }
        const name = record.name;
        if (!name) return;

        const key1 = normalizeBasic(name);
        const key2 = normalizeSorted(name);
        
        if (key1) addResult(key1, record);
        if (key2 && key2 !== key1) addResult(key2, record);

        // Also add variants for Chinese names
        const nameVariants = getAllNameVariants(name);
        nameVariants.forEach(variant => {
            const v1 = normalizeBasic(variant);
            const v2 = normalizeSorted(variant);
            if (v1) addResult(v1, record);
            if (v2 && v2 !== v1) addResult(v2, record);
        });
    });



    // Load career destinations for additional info and identify missing students
    const careerMap = new Map();
    const virtualStudents = [];
    const dbStudentIds = new Set(students.map(s => String(s.student_id_text || s.student_id || '')));

    try {
        if (fs.existsSync(CAREER_STATS_JSON)) {
            const careerData = JSON.parse(fs.readFileSync(CAREER_STATS_JSON, 'utf8'));
            if (careerData.topDestinations) {
                careerData.topDestinations.forEach(dest => {
                    if (dest.students) {
                        dest.students.forEach(s => {
                            const sid = String(s.id);
                            if (sid) {
                                careerMap.set(sid, dest.name);

                                // If this student from the career file is NOT in the database list,
                                // add them as a virtual student so they appear in the search.
                                if (!dbStudentIds.has(sid)) {
                                    virtualStudents.push({
                                        student_id_text: sid,
                                        full_name: s.name,
                                        enrollment_date: s.year + '-04-01', // Approximate
                                        status: 'graduated', // Historical students are graduated
                                        destination: dest.name,
                                        is_virtual: true
                                    });
                                    dbStudentIds.add(sid); // Avoid duplicates within this loop
                                }
                            }
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error loading career stats for summary:', e);
    }

    const allStudentsList = [...students, ...virtualStudents];
    
    // Also identify students from JLPT CSV data
    rawData.forEach(record => {
        const sid = record.studentId ? String(record.studentId) : null;
        const name = record.name;
        if (!name) return;
        
        // Add as a potential student if not in the list yet
        // We'll merge them by name later
        allStudentsList.push({
            student_id_text: sid,
            full_name: name,
            class_name: '過去の学生',
            nationality: record.country,
            is_historical: true
        });
    });

    // Merge students by normalized name to avoid duplicates
    const mergedStudentsMap = new Map(); // normalizedName -> student object
    
    allStudentsList.forEach(s => {
        const normName = normalizeSorted(s.full_name); // Use sorted for merging logic
        if (!normName) return;

        if (!mergedStudentsMap.has(normName)) {
            mergedStudentsMap.set(normName, s);
        } else {
            const existing = mergedStudentsMap.get(normName);
            // Merge logic: Prioritize DB student over virtual/historical
            const isExistingHistorical = existing.is_historical || existing.is_virtual;
            const isNewHistorical = s.is_historical || s.is_virtual;

            if (isExistingHistorical && !isNewHistorical) {
                // Replace historical with DB student but keep some fields if missing
                const merged = { ...s };
                if (!merged.destination) merged.destination = existing.destination;
                if (!merged.nationality) merged.nationality = existing.nationality;
                mergedStudentsMap.set(normName, merged);
            } else {
                // Keep existing (DB student) but maybe update missing fields
                if (!existing.student_id_text && s.student_id_text) existing.student_id_text = s.student_id_text;
                if (!existing.nationality && s.nationality) existing.nationality = s.nationality;
                if (!existing.destination && s.destination) existing.destination = s.destination;
                if (!existing.enrollment_date && s.enrollment_date) existing.enrollment_date = s.enrollment_date;
            }
        }
    });

    const allStudentsToProcess = Array.from(mergedStudentsMap.values());


    // Process each student
    const studentSummaries = allStudentsToProcess.map(student => {
        const studentId = String(student.student_id_text || student.student_id || '');
        const name = student.full_name;

        let myRecords = [];
        const seenRecordKeys = new Set(); // Avoid duplicates from ID + Name matching

        // 1. Match by ID
        if (studentId && studentResults.has(studentId)) {
            studentResults.get(studentId).forEach(r => {
                const key = `${r.session}-${r.level}-${r.date}`; // simple unique key
                if (!seenRecordKeys.has(key)) {
                    myRecords.push(r);
                    seenRecordKeys.add(key);
                }
            });
        }

        // 2. Match by Name
        if (name) {
            const keys = [
                normalizeBasic(name),
                normalizeSorted(name),
                ...getAllNameVariants(name).flatMap(v => [normalizeBasic(v), normalizeSorted(v)])
            ];
            
            const uniqueKeys = [...new Set(keys.filter(Boolean))];
            
            uniqueKeys.forEach(k => {
                if (studentResults.has(k)) {
                    studentResults.get(k).forEach(r => {
                        const key = `${r.session}-${r.level}-${r.date}`;
                        if (!seenRecordKeys.has(key)) {
                            myRecords.push(r);
                            seenRecordKeys.add(key);
                        }
                    });
                }
            });
        }



        // Aggregate by level
        const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
        const levelStatus = {};

        levels.forEach(level => {
            const levelRecords = myRecords.filter(r => r.level === level);
            const passed = levelRecords.find(r => r.result === '合格');

            if (passed) {
                levelStatus[level] = {
                    status: '合格',
                    score: passed.totalScore,
                    date: passed.session,
                    details: passed
                };
            } else if (levelRecords.length > 0) {
                // Find best score or latest
                const latest = levelRecords.sort((a, b) => b.session.localeCompare(a.session))[0];
                levelStatus[level] = {
                    status: '不合格',
                    score: latest.totalScore,
                    date: latest.session,
                    details: latest
                };
            } else {
                levelStatus[level] = { status: '未受験' };
            }
        });

        // Calculate highest passed level
        let highestLevel = null;
        for (const level of levels) {
            if (levelStatus[level].status === '合格') {
                highestLevel = level;
                break; // Found highest (N1 -> N5)
            }
        }

        // Calculate enrollment year
        let enrollmentYear = null;
        if (student.enrollment_date) {
            const d = new Date(student.enrollment_date);
            if (!isNaN(d.getTime())) {
                enrollmentYear = d.getFullYear();
            }
        }
        if (!enrollmentYear && studentId) {
            const parsed = parseStudentIdForEnrollment(studentId);
            if (parsed) {
                enrollmentYear = parsed.enrollmentYear;
            }
        }

        return {
            studentId: student.student_id_text || student.student_id,
            name: student.full_name,
            class: student.class_name || (student.is_virtual ? '卒業生' : ''),
            nationality: student.nationality || student.country,
            destination: student.destination || student.career_destination || careerMap.get(studentId) || null,
            enrollmentYear: enrollmentYear,
            status: student.status || (student.is_virtual || student.is_historical ? 'graduated' : 'active'),
            levels: levelStatus,
            highestLevel: highestLevel,
            records: myRecords,
            isVirtual: !!student.is_virtual
        };
    });

    return studentSummaries;
}

/**
 * Get JLPT Section (科目別) Score Analysis from CSV data
 * CSVには以下の科目別得点が含まれる:
 * - 言語知識（文字・語彙・文法）: 60点満点
 * - 読解: 60点満点
 * - 聴解: 60点満点
 */
export async function getJlptSectionScoreStats() {
    try {
        const sectionData = {
            byLevel: {},      // レベル別平均点
            byNationality: {}, // 国籍別平均点
            bySection: {},    // 科目別平均点
            bySectionLevel: [], // 科目×レベル別詳細
            overall: {}       // 全体統計
        };

        const sectionStats = {};  // { section: { level: { total: [], passed: [], failed: [] } } }
        const nationalitySectionStats = {}; // { country: { section: { scores: [] } } }

        if (!fs.existsSync(JLPT_BASE_DIR)) {
            console.log('JLPT結果フォルダが見つかりません:', JLPT_BASE_DIR);
            return sectionData;
        }

        const sessions = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const session of sessions) {
            const sessionDir = path.join(JLPT_BASE_DIR, session);
            const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

            for (const file of files) {
                const filePath = path.join(sessionDir, file);
                // ファイル名からレベルを推測（N1.csv, N2.csv等の場合）
                // SCORE_*.csv形式の場合はファイル名からレベルが取得できないため、各行で判定
                const levelFromFilename = file.match(/^(N[1-5])\.csv$/i)?.[1]?.toUpperCase();

                let content;
                try {
                    const buffer = fs.readFileSync(filePath);
                    content = iconv.decode(buffer, 'Shift_JIS');
                } catch {
                    content = fs.readFileSync(filePath, 'utf-8');
                }

                const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length < 2) continue;

                // Skip header
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    const parts = parseCSVLine(line);

                    if (parts.length < 17) continue;

                    // CSVの3列目（インデックス2）からレベルを取得（SCORE_*.csv形式対応）
                    const level = levelFromFilename || parts[2]?.toUpperCase();
                    if (!level || !level.match(/^N[1-5]$/)) continue;

                    const result = parts[8];
                    const country = parts[5];

                    // 欠席を除外
                    if (result !== '合格' && result !== '不合格') continue;

                    // 科目別得点を抽出 (インデックス: 11=得点区分名1, 12=得点区分別得点1, ...)
                    // N1-N3: 言語知識(12), 読解(14), 聴解(16) の3区分
                    // N4-N5: 言語知識・読解(12), 聴解(14) の2区分
                    let sections;
                    if (level === 'N4' || level === 'N5') {
                        sections = [
                            { name: '言語知識', scoreIdx: 12 },  // 言語知識・読解の合算
                            { name: '聴解', scoreIdx: 14 }
                        ];
                    } else {
                        sections = [
                            { name: '言語知識', scoreIdx: 12 },
                            { name: '読解', scoreIdx: 14 },
                            { name: '聴解', scoreIdx: 16 }
                        ];
                    }

                    for (const sec of sections) {
                        const scoreStr = parts[sec.scoreIdx] || '';
                        if (!scoreStr || !scoreStr.includes('/') || scoreStr.includes('**')) continue;

                        const score = parseInt(scoreStr.split('/')[0], 10);
                        if (isNaN(score) || score <= 0) continue;

                        // セクション別統計
                        if (!sectionStats[sec.name]) {
                            sectionStats[sec.name] = {};
                        }
                        if (!sectionStats[sec.name][level]) {
                            sectionStats[sec.name][level] = { total: [], passed: [], failed: [] };
                        }

                        sectionStats[sec.name][level].total.push(score);
                        if (result === '合格') {
                            sectionStats[sec.name][level].passed.push(score);
                        } else {
                            sectionStats[sec.name][level].failed.push(score);
                        }

                        // 国籍別統計
                        if (country) {
                            if (!nationalitySectionStats[country]) {
                                nationalitySectionStats[country] = {};
                            }
                            if (!nationalitySectionStats[country][sec.name]) {
                                nationalitySectionStats[country][sec.name] = [];
                            }
                            nationalitySectionStats[country][sec.name].push(score);
                        }
                    }
                }
            }
        }

        // 集計結果を整形
        // 1. 科目×レベル別詳細
        const sectionLevelData = [];
        for (const section of ['言語知識', '読解', '聴解']) {
            const levelData = sectionStats[section] || {};
            for (const level of ['N1', 'N2', 'N3', 'N4', 'N5']) {
                const data = levelData[level];
                if (!data || data.total.length === 0) continue;

                const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;

                sectionLevelData.push({
                    section,
                    level,
                    count: data.total.length,
                    avgScore: avg(data.total),
                    maxScore: Math.max(...data.total),
                    minScore: Math.min(...data.total),
                    passedAvg: avg(data.passed),
                    failedAvg: avg(data.failed)
                });
            }
        }
        sectionData.bySectionLevel = sectionLevelData;

        // 2. レベル別平均点（全科目合計）
        const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
        const levelAvgData = {};
        for (const level of levels) {
            const allScores = [];
            for (const section of ['言語知識', '読解', '聴解']) {
                const data = sectionStats[section]?.[level];
                if (data) allScores.push(...data.total);
            }
            if (allScores.length > 0) {
                levelAvgData[level] = {
                    count: allScores.length,
                    avgScore: Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10) / 10
                };
            }
        }
        sectionData.byLevel = levelAvgData;

        // 3. 科目別平均点
        for (const section of ['言語知識', '読解', '聴解']) {
            const allScores = [];
            const passedScores = [];
            const failedScores = [];
            const levelData = sectionStats[section] || {};
            for (const level of levels) {
                if (levelData[level]) {
                    allScores.push(...levelData[level].total);
                    passedScores.push(...levelData[level].passed);
                    failedScores.push(...levelData[level].failed);
                }
            }
            if (allScores.length > 0) {
                sectionData.bySection[section] = {
                    count: allScores.length,
                    avgScore: Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10) / 10,
                    maxScore: Math.max(...allScores),
                    minScore: Math.min(...allScores),
                    passedAvg: passedScores.length > 0 ? Math.round(passedScores.reduce((a, b) => a + b, 0) / passedScores.length * 10) / 10 : null,
                    failedAvg: failedScores.length > 0 ? Math.round(failedScores.reduce((a, b) => a + b, 0) / failedScores.length * 10) / 10 : null
                };
            }
        }

        // 4. 国籍別科目別平均点（上位10国）
        const nationalityData = [];
        for (const [country, sections] of Object.entries(nationalitySectionStats)) {
            let totalScores = 0;
            let scoreCount = 0;
            const sectionAvgs = {};

            for (const [section, scores] of Object.entries(sections)) {
                if (scores.length > 0) {
                    sectionAvgs[section] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
                    totalScores += scores.reduce((a, b) => a + b, 0);
                    scoreCount += scores.length;
                }
            }

            if (scoreCount > 0) { // 全ての国籍を表示
                nationalityData.push({
                    country,
                    totalRecords: scoreCount,
                    avgScore: Math.round(totalScores / scoreCount * 10) / 10,
                    ...sectionAvgs
                });
            }
        }
        sectionData.byNationality = nationalityData.sort((a, b) => b.avgScore - a.avgScore); // 全体平均が高い順

        // 5. 全体統計
        let grandTotalScores = [];
        for (const section of ['言語知識', '読解', '聴解']) {
            const levelData = sectionStats[section] || {};
            for (const level of levels) {
                if (levelData[level]) {
                    grandTotalScores.push(...levelData[level].total);
                }
            }
        }

        if (grandTotalScores.length > 0) {
            sectionData.overall = {
                totalRecords: grandTotalScores.length,
                avgScore: Math.round(grandTotalScores.reduce((a, b) => a + b, 0) / grandTotalScores.length * 10) / 10,
                maxScore: Math.max(...grandTotalScores),
                minScore: Math.min(...grandTotalScores)
            };
        }

        console.log(`Section Score Stats: ${sectionData.bySectionLevel.length} records`);
        return sectionData;

    } catch (error) {
        console.error('Error getting section score stats:', error);
        return {
            byLevel: {},
            byNationality: [],
            bySection: {},
            bySectionLevel: [],
            overall: {}
        };
    }
}

/**
 * Helper function to parse CSV line with proper quote handling
 */
function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            parts.push(current.replace(/^"|"$/g, '').trim());
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current.replace(/^"|"$/g, '').trim());

    return parts;
}

