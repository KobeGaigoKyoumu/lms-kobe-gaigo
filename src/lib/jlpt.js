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
        // First, load historical data from JSON (has student IDs)
        const historicalData = loadHistoricalJlptData();
        console.log(`Loaded ${historicalData.length} records from historical JSON`);

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

        // Then load CSV data (may not have student IDs)
        if (fs.existsSync(JLPT_BASE_DIR)) {
            const sessions = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

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
            if (s.student_id) {
                const parsed = parseStudentIdForEnrollment(s.student_id);
                if (parsed) {
                    studentIdMap.set(String(s.student_id), {
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
            byLevel[level] = { total: 0, passed: 0 };
        }
        byLevel[level].total++;
        if (record.result === '合格') byLevel[level].passed++;
    });

    const levelStats = Object.entries(byLevel)
        .map(([level, stats]) => ({
            level,
            total: stats.total,
            passed: stats.passed,
            passRate: ((stats.passed / stats.total) * 100).toFixed(1)
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
            // If no ID, use name as proxy (though risky) or just increment simple counter?
            // Use name + country + level as unique key fallback
            const key = `${record.name}:${record.country}:${record.level}`;
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
            const sid = s.student_id;
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

            // For Exam Rate: Use UNIQUE examinees / Enrolled
            const uniqueExaminees = stats.unique_students ? stats.unique_students.size : stats.total;
            const examRate = enrolled > 0 ? ((uniqueExaminees / enrolled) * 100).toFixed(1) : 0;

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

            // Check if exam is before enrollment
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
            gradYear = examYear + 1;
        }

        if (isFirstYearData) return; // SKIP pre-enrollment data

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
            if (foundEnrollment && record.studentId) {
                studentExamHistory[name].graduationYear = gradYear;
                studentExamHistory[name].studentId = record.studentId;
            } else if (!studentExamHistory[name].studentId) {
                // Keep max grad year for unmatched
                studentExamHistory[name].graduationYear = Math.max(studentExamHistory[name].graduationYear, gradYear);
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
            nonKanjiRate: stats.nonKanjiTotal > 0 ? ((stats.nonKanjiN3Plus / stats.nonKanjiTotal) * 100).toFixed(1) : '-'
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

    rawData.forEach(record => {
        if (record.studentId) {
            addResult(String(record.studentId), record);
        }
        if (record.name) {
            addResult(record.name.toLowerCase().trim(), record);
        }
        // Also add variants for Chinese names
        const nameVariants = getAllNameVariants(record.name);
        nameVariants.forEach(variant => {
            if (variant !== record.name?.toLowerCase()?.trim()) {
                addResult(variant, record);
            }
        });
    });

    // Process each student
    const studentSummaries = students.map(student => {
        const studentId = String(student.student_id_text || student.student_id || '');
        const name = student.full_name?.toLowerCase()?.trim();

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

        // 2. Match by Name (if ID match didn't find everything, or to cover missing IDs)
        // Note: Name matching can be risky, but we filter loosely. 
        // Ideally we prioritize ID matches.
        if (name) {
            // Check direct match and variants
            const variants = getAllNameVariants(student.full_name);
            variants.forEach(variant => {
                if (studentResults.has(variant)) {
                    studentResults.get(variant).forEach(r => {
                        const key = `${r.session}-${r.level}-${r.date}`;
                        if (!seenRecordKeys.has(key)) {
                            // Optional: Check enrollment date if strictly needed, 
                            // but for class analysis we generally assume name match is valid
                            // unless common name.
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

        return {
            studentId: student.student_id_text || student.student_id,
            name: student.full_name,
            class: student.class_name,
            levels: levelStatus,
            highestLevel: highestLevel,
            records: myRecords
        };
    });

    return studentSummaries;
}
