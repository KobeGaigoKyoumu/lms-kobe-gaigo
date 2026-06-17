const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const OUTPUT_PATH = './src/data/career_stats_v2.json';
const CAREER_DIR = 'e:/デスクトップ/LMS(神戸外語)/卒業生進路一覧';
const JLPT_EXCEL_PATH = 'e:/デスクトップ/LMS(神戸外語)/歴代受験結果データベース.xlsx';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function toHalfWidth(str) {
    if (!str) return '';
    return str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    }).replace(/[\s\u3000]/g, '');
}

const normSchoolName = (n) => toHalfWidth(n.toLowerCase());

const normalizeDestination = (d) => {
    if (!d) return '';
    const name = String(d).replace(/\s+/g, '').trim();

    const mapping = {
        '東亜経理': '東亜経理専門学校神戸駅前校',
        '東亜経理専門学校': '東亜経理専門学校神戸駅前校',
        '東京国際ビジネスカレッジ': '専門学校東京国際ビジネスカレッジ神戸校',
        '東京国際ビジネスカレッジ神戸校': '専門学校東京国際ビジネスカレッジ神戸校',
        '東京国際ビジネスカレッジ神戸': '専門学校東京国際ビジネスカレッジ神戸校',
        'アートカレッジ': '専門学校アートカレッジ神戸',
        'アートカレッジ神戸': '専門学校アートカレッジ神戸',
        '専門学校アートカレッジ神戸': '専門学校アートカレッジ神戸',
        '愛甲': '愛甲学院専門学校',
        '愛甲学院': '愛甲学院専門学校',
        '愛甲学院専門学校': '愛甲学院専門学校',
        'ICT': 'ＩＣＴ専門学校',
        'ICT専門学校': 'ＩＣＴ専門学校',
        'ＩＣＴ専門学校': 'ＩＣＴ専門学校',
        'ＩＣＴ専門学校高砂校': 'ＩＣＴ専門学校高砂校',
        '関西国際旅行ホテル専門学校': '関西国際旅行・ホテル専門学校',
        '関西国際旅行・ホテル専門学校': '関西国際旅行・ホテル専門学校',
        'トヨタ自動車大学校': '専門学校トヨタ神戸自動車大学校',
        'トヨタ神戸自動車大学校': '専門学校トヨタ神戸自動車大学校',
        'トヨタ自動車大学校神戸校': '専門学校トヨタ神戸自動車大学校',
        '大原': '大原簿記専門学校神戸校',
        '大原簿記専門学校三宮校': '大原簿記専門学校神戸校',
        '大原簿記専門学校': '大原簿記専門学校神戸校',
        '大原簿記専門学校神戸校': '大原簿記専門学校神戸校',
        '日本コンピュータ': '日本コンピュータ専門学校',
        '日本コンピュータ専門学校': '日本コンピュータ専門学校',
        '日本コンピューター専門学校': '日本コンピュータ専門学校',
        '和歌山福祉専門学校': '和歌山社会福祉専門学校',
        '和歌山社会福祉専門学校': '和歌山社会福祉専門学校',
        '駿台観光&外語ビジネス専門学校': '駿台観光＆外語ビジネスカレッジ大阪',
        '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネスカレッジ大阪',
        '駿台観光＆外語ビジネスカレッジ大阪': '駿台観光＆外語ビジネスカレッジ大阪',
        '中日本自動車': '中日本自動車短期大学',
        '中日本自動車短期大学': '中日本自動車短期大学',
        '阪神自動車航空専門学校': '阪神自動車航空鉄道専門学校',
        '阪神自動車航空鉄道専門学校': '阪神自動車航空鉄道専門学校',
        '国際外語観光エアライン専門学校': '国際外語・観光・エアライン専門学校',
        '東京工科自動車大学校': '専門学校東京工科自動車大学校',
        '日本工科大学校': '専門学校日本工科大学校',
        '新潟国際自動車大学校': '専門学校新潟国際自動車大学校',
        '長岡公務員情報ビジネス専門学校': '長岡公務員・情報ビジネス専門学校',
        '西日本アカデミー航空専門学校': '西日本アカデミー専門学校',
        '東京テクニカルカレッジ': '専門学校東京テクニカルカレッジ',
        '日本モータースポーツ専門学校': '日本モータースポーツ専門学校大阪校',
        '栃木グローバルビジネスカレッジ': '専門学校栃木グローバルビジネスカレッジ',
        '大阪コミュニティーワーカー専門学校': '大阪コミュニティワーカー専門学校',
        'ＯＣＡ大阪デザイン＆ＩＴ専門学校': 'ＯＣＡ大阪デザイン＆テクノロジー専門学校',
        '神戸国際ビジネスカレッジ': '専門学校神戸国際ビジネスカレッジ'
    };

    return mapping[name] || name;
};

async function run() {
    try {
        fs.writeFileSync('processing_log.txt', 'Starting log\n');
        console.log('Starting Career Stats Update...');

        // Fetch master schools for fuzzy matching
        console.log('Fetching master schools from DB...');
        const { data: dbSchools, error: dbErr } = await supabase
            .from('master_schools')
            .select('name');
        if (dbErr) throw dbErr;
        const dbSchoolNames = dbSchools.map(s => s.name);
        console.log(`Loaded ${dbSchoolNames.length} master schools for matching.`);

        // 1. Build Student ID -> Destination Map & Destination Yearly Counts
        const studentDestinations = {};
        const destinationYearlyStats = {}; // { DestName: { "2021": count, "2022": count ... } }
        const destinationStudents = {}; // { DestName: [ { year, id, name }... ] }
        const files = fs.readdirSync(CAREER_DIR).filter(f => f.endsWith('.xlsx'));

        console.log(`Found ${files.length} career list files.`);

        files.forEach(file => {
            const filePath = path.join(CAREER_DIR, file);
            const match = file.match(/^(\d{4})/);
            const year = match ? match[1] : 'Unknown';
            const seenInYear = new Set();

            try {
                const workbook = XLSX.readFile(filePath);

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

                            const rawDest = normalizeDestination(dest);
                            
                            // Fuzzy match with DB master schools
                            let destName = rawDest;
                            const dbMatch = dbSchoolNames.find(n => normSchoolName(n) === normSchoolName(rawDest));
                            if (dbMatch) {
                                destName = dbMatch;
                            } else {
                                // Ignore "専門学校" prefix/suffix and try matching
                                const cleanDest = normSchoolName(rawDest).replace(/^専門学校/, '').replace(/専門学校$/, '');
                                const fuzzyMatch = dbSchoolNames.find(n => {
                                    const cleanN = normSchoolName(n).replace(/^専門学校/, '').replace(/専門学校$/, '');
                                    return cleanN === cleanDest;
                                });
                                if (fuzzyMatch) {
                                    destName = fuzzyMatch;
                                }
                            }

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

                    if (level && !isNaN(score) && id) {
                        const studentId = String(id).trim();
                        const destName = studentDestinations[studentId];

                        if (destName) {
                            if (!destinationStats[destName]) destinationStats[destName] = {};
                            if (!destinationStats[destName][level]) {
                                destinationStats[destName][level] = { passed: [], failed: [] };
                            }

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
            const uniqueDestinations = {};

            data.topDestinations.forEach(d => {
                const rawDest = normalizeDestination(d.name);
                
                // Also fuzzy match the template destinations list to map to DB formal names
                let destName = rawDest;
                const dbMatch = dbSchoolNames.find(n => normSchoolName(n) === normSchoolName(rawDest));
                if (dbMatch) {
                    destName = dbMatch;
                } else {
                    const cleanDest = normSchoolName(rawDest).replace(/^専門学校/, '').replace(/専門学校$/, '');
                    const fuzzyMatch = dbSchoolNames.find(n => {
                        const cleanN = normSchoolName(n).replace(/^専門学校/, '').replace(/専門学校$/, '');
                        return cleanN === cleanDest;
                    });
                    if (fuzzyMatch) {
                        destName = fuzzyMatch;
                    }
                }

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

                const totalCount = Object.values(yearsObj).reduce((a, b) => a + b, 0);

                if (!uniqueDestinations[destName]) {
                    uniqueDestinations[destName] = {
                        ...d,
                        name: destName,
                        count: totalCount || d.count,
                        years: yearsObj,
                        jlptStats: jlptStats,
                        students: destinationStudents[destName] || []
                    };
                } else {
                    console.log(`Merging duplicate entry for normalized name: ${destName}`);
                }
            });

            data.topDestinations = Object.values(uniqueDestinations).sort((a, b) => b.count - a.count);
        }

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
        console.log('Updated career_stats_v2.json with REAL linked JLPT data and exact DB names.');

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

run();
