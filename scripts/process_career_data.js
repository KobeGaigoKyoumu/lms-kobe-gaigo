/**
 * Career Data Processing Script
 * Reads all graduate career Excel files and generates aggregated statistics
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const OUTPUT_FILE = 'src/data/career_stats.json';

// Files to process (excluding 2021 which has no data)
const FILES = [
    { file: '2017年度入学生進路一覧.xlsx', year: 2017 },
    { file: '2018年度入学生進路一覧.xlsx', year: 2018 },
    { file: '2019年度入学生進路一覧.xlsx', year: 2019 },
    { file: '2020年度入学生進路一覧.xlsx', year: 2020 },
    { file: '2022年度入学生進路一覧.xlsx', year: 2022 },
    { file: '2023年度入学生進路一覧.xlsx', year: 2023 },
];

// Column mappings (may vary by file)
const COLUMN_NAMES = {
    studentId: '学籍番号',
    class: 'クラス',
    name: '氏名',
    nationality: '国籍',
    graduationStatus: '卒業・退学',
    careerCategory: '進路区分',
    finalSchool: '最終合格校',
    applicationExperience: '出願経験',
    destination: '進学先',
};

function readExcelFile(filePath) {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
}

function processCareerData() {
    const allData = [];
    const yearlyStats = {};
    const categoryStats = {};
    const nationalityStats = {};
    const destinationCounts = {};

    FILES.forEach(({ file, year }) => {
        const filePath = path.join(DATA_DIR, file);
        console.log(`Processing: ${file}`);

        try {
            const data = readExcelFile(filePath);
            console.log(`  Found ${data.length} records`);

            // Initialize yearly stats
            yearlyStats[year] = {
                total: 0,
                graduated: 0,
                withdrawn: 0,
                categories: {},
                nationalities: {}
            };

            data.forEach(row => {
                const record = {
                    year,
                    nationality: row[COLUMN_NAMES.nationality] || row['国籍'] || 'Unknown',
                    graduationStatus: row[COLUMN_NAMES.graduationStatus] || row['卒業・退学'] || 'Unknown',
                    careerCategory: row[COLUMN_NAMES.careerCategory] || row['進路区分'] || 'Unknown',
                    destination: row[COLUMN_NAMES.destination] || row['進学先'] || row['最終合格校'] || '',
                };

                // Normalize destination names
                if (record.destination) {
                    if (record.destination === '東亜経理') {
                        record.destination = '東亜経理専門学校';
                    } else if (record.destination === 'アートカレッジ神戸') {
                        record.destination = '専門学校アートカレッジ神戸';
                    } else if (record.destination === '東京国際ビジネスカレッジ') {
                        record.destination = '東京国際ビジネスカレッジ神戸校';
                    } else if (record.destination === '愛甲') {
                        record.destination = '愛甲学院専門学校';
                    }
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
                const nationality = record.nationality;
                if (nationality && nationality !== 'Unknown') {
                    if (!nationalityStats[nationality]) {
                        nationalityStats[nationality] = { total: 0, categories: {} };
                    }
                    nationalityStats[nationality].total++;
                    nationalityStats[nationality].categories[category] =
                        (nationalityStats[nationality].categories[category] || 0) + 1;

                    yearlyStats[year].nationalities[nationality] =
                        (yearlyStats[year].nationalities[nationality] || 0) + 1;
                }

                // Destination counts (for top destinations)
                if (record.destination && record.destination.trim()) {
                    destinationCounts[record.destination] = (destinationCounts[record.destination] || 0) + 1;
                }
            });
        } catch (error) {
            console.error(`Error processing ${file}:`, error.message);
        }
    });

    // Sort top destinations
    const topDestinations = Object.entries(destinationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

    // Sort nationalities by total
    const sortedNationalities = Object.entries(nationalityStats)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, stats]) => ({ name, ...stats }));

    // Calculate yearly rates
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
            years: years.map(y => parseInt(y)),
            categories: Object.keys(categoryStats),
        },
        categoryStats,
        yearlyTrends,
        nationalityStats: sortedNationalities,
        topDestinations,
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\nCareer stats saved to ${OUTPUT_FILE}`);
    console.log(`Total records: ${allData.length}`);
    console.log('Categories found:', Object.keys(categoryStats));

    return result;
}

processCareerData();
