/**
 * Career Data Processing Script
 * Reads all graduate career Excel files and generates aggregated statistics
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const OUTPUT_FILE = 'src/data/career_stats.json';

// Files to process
const FILES = [
    { file: '2017年度入学生進路一覧.xlsx', year: 2017 },
    { file: '2018年度入学生進路一覧.xlsx', year: 2018 },
    { file: '2019年度入学生進路一覧.xlsx', year: 2019 },
    { file: '2020年度入学生進路一覧.xlsx', year: 2020 },
    { file: '2022年度入学生進路一覧.xlsx', year: 2022 },
    { file: '2023年度入学生進路一覧.xlsx', year: 2023 },
];

/**
 * Helper to find value from multiple potential column names
 */
function getValue(row, keys) {
    // Normalize row keys (remove spaces)
    const normalizedRow = {};
    Object.keys(row).forEach(k => {
        normalizedRow[k.replace(/\s+/g, '')] = row[k];
    });

    for (const key of keys) {
        const normalizedKey = key.replace(/\s+/g, '');
        if (normalizedRow[normalizedKey] !== undefined) {
            return normalizedRow[normalizedKey];
        }
    }
    return undefined;
}

/**
 * Helper to check if a row looks like a student record
 */
function isStudentRow(row) {
    return getValue(row, ['国籍', '出身国', 'Country']) ||
        getValue(row, ['学籍番号', 'ID', 'Student ID']) ||
        getValue(row, ['氏名', '名前', 'Name', '氏　名']);
}

/**
 * Helper to guess nationality from name
 */
function guessNationality(name) {
    if (!name) return null;

    const upperName = name.toUpperCase();

    // Vietnam (Common Romanized Surnames)
    if (upperName.includes('NGUYEN') ||
        upperName.includes('TRAN') ||
        upperName.includes('PHAM') ||
        upperName.includes('LE ') ||
        upperName.includes('VO ') ||
        upperName.includes('HOANG') ||
        upperName.includes('DANG') ||
        upperName.includes('BUI ')) {
        return 'ベトナム';
    }

    // China (All Kanji, 2-4 characters)
    // Regex for Kanji only (allowing spaces)
    if (/^[\u4e00-\u9faf\u3000\s]+$/.test(name)) {
        return '中国';
    }

    // Nepal (Common Romanized/Katakana Surnames)
    if (upperName.includes('KHADKA') ||
        upperName.includes('SHRESTHA') ||
        upperName.includes('TAMANG') ||
        upperName.includes('KC') ||
        upperName.includes('GURUNG')) {
        return 'ネパール';
    }

    return null;
}

/**
 * Read enrollment file for lookup
 */
/**
 * Read all master enrollment files for lookup
 */
function getEnrollmentMap() {
    const map = {}; // ID -> Nationality
    const MASTER_DIR = 'e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者';
    const MASTER_FILES = ['修了者.xlsx', '卒業者.xlsx', '在籍者.xlsx', '退学者.xlsx'];

    MASTER_FILES.forEach(file => {
        try {
            const filePath = path.join(MASTER_DIR, file);
            if (fs.existsSync(filePath)) {
                console.log(`Loading master data: ${file}`);
                const wb = XLSX.readFile(filePath);
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                let count = 0;
                data.forEach(row => {
                    const id = getValue(row, ['学籍番号', 'ID']);
                    const nat = getValue(row, ['国籍・地域', '国籍']);
                    if (id && nat) {
                        map[id] = nat;
                        count++;
                    }
                });
                console.log(`  Loaded ${count} records.`);
            }
        } catch (e) {
            console.log(`Error reading master file ${file}:`, e.message);
        }
    });

    console.log(`Total master records loaded: ${Object.keys(map).length}`);
    return map;
}

/**
 * Read Excel file (all sheets)
 */
function readExcelFile(filePath) {
    const wb = XLSX.readFile(filePath);
    let allRows = [];

    wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws);

        // Filter for valid student rows
        const validRows = rows.filter(isStudentRow);

        if (validRows.length > 0) {
            console.log(`    Sheet "${sheetName}": ${validRows.length} records`);
            allRows = allRows.concat(validRows);
        }
    });

    return allRows;
}

function processCareerData() {
    const allData = [];
    const yearlyStats = {};
    const categoryStats = {};
    const nationalityStats = {};
    const destinationCounts = {};
    const destinationDetails = {};

    // Load enrollment map for nationality lookup
    const enrollmentMap = getEnrollmentMap();

    // Clear debug log
    try { fs.writeFileSync('debug_unknown_nationality.txt', ''); } catch (e) { }

    FILES.forEach(({ file, year }) => {
        const filePath = path.join(DATA_DIR, file);
        console.log(`Processing: ${file}`);

        try {
            const data = readExcelFile(filePath);
            console.log(`  Total found: ${data.length} records`);

            // Deduplicate logic
            const uniqueData = [];
            const seen = new Set();

            data.forEach(row => {
                // Initial extraction (without guesswork) for deduplication
                const name = getValue(row, ['氏名', '名前', 'Name', '氏　名']) || '';
                // Try to find ANY identifier to dedupe
                const id = getValue(row, ['学籍番号', 'ID']) || '';

                // Use Name + ID as key if possible, else Name + Year
                // Note: Nationality might be missing so don't use it for key if possible
                const key = `${year}-${id}-${name}`;

                if ((name || id) && !seen.has(key)) {
                    seen.add(key);
                    uniqueData.push(row);
                }
            });

            console.log(`  Unique students: ${uniqueData.length}`);

            // Initialize yearly stats
            yearlyStats[year] = {
                total: 0,
                graduated: 0,
                withdrawn: 0,
                categories: {},
                nationalities: {}
            };

            uniqueData.forEach(row => {
                let nationality = getValue(row, ['国籍', '出身地', '国', 'Nationality', 'Country']);
                const studentId = getValue(row, ['学籍番号', 'ID', 'Student ID']);
                const name = getValue(row, ['氏名', '名前', 'Name', '氏　名']);

                // Fallback 1: Lookup in Enrollment Map
                if (!nationality && studentId && enrollmentMap[studentId]) {
                    nationality = enrollmentMap[studentId];
                }

                // Fallback 2: Name Heuristic (Restored because Master Data is missing 2017+ records)
                if (!nationality && name) {
                    nationality = guessNationality(name);
                }

                const record = {
                    year,
                    nationality: nationality || 'Unknown',
                    graduationStatus: getValue(row, ['卒業・退学', '状態', 'Status', '卒業・修了・退学']) || 'Unknown',
                    careerCategory: getValue(row, ['進路区分', '区分', 'Category']) || 'Unknown',
                    destination: getValue(row, ['進学先', '最終合格校', '就職先', 'Destination', 'School']) || '',
                };

                // Debug log only if STILL Unknown
                if (record.nationality === 'Unknown') {
                    try {
                        const logMsg = `[DEBUG] Unknown Nationality in ${year} (Name: ${name})\n`;
                        fs.appendFileSync('debug_unknown_nationality.txt', logMsg);
                    } catch (e) { }
                }

                // DATA CLEANING & NORMALIZATION
                // Normalize destination names
                if (record.destination) {
                    const d = record.destination.trim();
                    if (d === '東亜経理') record.destination = '東亜経理専門学校';
                    else if (d === 'アートカレッジ神戸' || d === '専門学校アートカレッジ神戸') record.destination = '専門学校アートカレッジ神戸';
                    else if (d === '東京国際ビジネスカレッジ') record.destination = '東京国際ビジネスカレッジ神戸校';
                    else if (d === '愛甲' || d === '愛甲学院') record.destination = '愛甲学院専門学校';
                    else if (d === 'ICT') record.destination = 'ICT専門学校';
                    else if (d === '関西国際旅行ホテル専門学校') record.destination = '関西国際旅行・ホテル専門学校';
                    else if (d === 'トヨタ自動車大学校') record.destination = 'トヨタ自動車大学校神戸校';
                    else if (d === '大原') record.destination = '大原簿記専門学校三宮校';
                    else if (d === '日本コンピュータ') record.destination = '日本コンピュータ専門学校';
                    else if (d === '和歌山福祉専門学校') record.destination = '和歌山社会福祉専門学校';
                    else if (d === 'アートカレッジ') record.destination = '専門学校アートカレッジ神戸';
                }

                allData.push(record);

                // Yearly stats
                yearlyStats[year].total++;
                if (record.graduationStatus === '卒業') {
                    yearlyStats[year].graduated++;
                } else if (record.graduationStatus === '退学') {
                    yearlyStats[year].withdrawn++;
                }

                // Category stats
                const category = record.careerCategory;
                if (category && category !== 'Unknown') {
                    categoryStats[category] = (categoryStats[category] || 0) + 1;
                    yearlyStats[year].categories[category] = (yearlyStats[year].categories[category] || 0) + 1;
                }

                // Nationality stats
                if (record.nationality && record.nationality !== 'Unknown') {
                    if (!nationalityStats[record.nationality]) {
                        nationalityStats[record.nationality] = { total: 0, categories: {} };
                    }
                    nationalityStats[record.nationality].total++;
                    nationalityStats[record.nationality].categories[category] =
                        (nationalityStats[record.nationality].categories[category] || 0) + 1;

                    yearlyStats[year].nationalities[record.nationality] =
                        (yearlyStats[year].nationalities[record.nationality] || 0) + 1;
                }

                // Destination counts (for top destinations)
                // Filter out '帰国' (Return to Country) from destination rankings
                if (record.destination && record.destination.trim() && record.destination !== '帰国') {
                    const dest = record.destination;
                    destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;

                    // Detailed breakdown
                    if (!destinationDetails[dest]) {
                        destinationDetails[dest] = { total: 0, years: {} };
                    }
                    destinationDetails[dest].total++;
                    destinationDetails[dest].years[year] = (destinationDetails[dest].years[year] || 0) + 1;
                }
            });

        } catch (error) {
            console.error(`Error processing ${file}:`, error.message);
        }
    });

    // Post-processing output
    const topDestinations = Object.entries(destinationDetails)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, stats]) => ({ name, count: stats.total, years: stats.years }));

    const sortedNationalities = Object.entries(nationalityStats)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, stats]) => ({ name, ...stats }));

    const years = Object.keys(yearlyStats).sort();
    const yearlyTrends = years.map(year => {
        const stats = yearlyStats[year];
        const graduationRate = stats.total > 0 ? ((stats.graduated / stats.total) * 100).toFixed(1) : 0;
        return {
            year: parseInt(year),
            total: stats.total,
            graduated: stats.graduated,
            withdrawn: stats.withdrawn,
            graduationRate: parseFloat(graduationRate),
            categories: stats.categories
        };
    });

    const result = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalRecords: allData.length,
            totalGraduates: allData.filter(r => r.graduationStatus === '卒業').length,
            years: years.map(y => parseInt(y)),
            years: years.map(y => parseInt(y)),
            categories: Object.keys(categoryStats),
        },
        categoryStats,
        yearlyTrends,
        nationalityStats: sortedNationalities,
        topDestinations,
    };

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\nCareer stats saved to ${OUTPUT_FILE}`);
    console.log(`Total records: ${allData.length}`);
    console.log(`Records with Unknown nationality: ${(fs.readFileSync('debug_unknown_nationality.txt', 'utf8').match(/\n/g) || []).length}`);

    return result;
}

processCareerData();
