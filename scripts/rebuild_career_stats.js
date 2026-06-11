require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_PATH = path.join(__dirname, '../src/data/career_stats_v2.json');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const files = [
    { year: 2017, name: '2017年度　卒業生　卒業進路.xlsx' },
    { year: 2018, name: '2018年度　進路状況.xlsx' },
    { year: 2019, name: '2019年度　進路状況(20200615)②.xlsx' },
    { year: 2020, name: '2020年度　卒業進路.xlsx' },
    { year: 2021, name: '2021年度　進路状況.xlsx' },
    { year: 2022, name: '2022年度 進路状況.xlsx' }, // Note: half-width space
    { year: 2023, name: '2023年度　進路一覧.xlsx' },
    { year: 2024, name: '2024年度　進路一覧.xlsx' },
    { year: 2025, name: '2025年度 進路状況【最新版】.xlsx' }
];

// Mapping rules for name normalization
const normalizeDestination = (d) => {
    if (!d) return '';

    // Remove date patterns like (11/16) or （11/1） or （12月17) etc.
    let name = String(d).trim();
    name = name.replace(/[\(（]\s*\d+\s*[\/\-]\s*\d+\s*[\)）]/g, '');
    name = name.replace(/[\(（]\s*\d+\s*月\s*\d+\s*日\s*[\)）]/g, '');
    name = name.replace(/\s+/g, '').trim();

    // Partial match integration rules
    if (name.startsWith('神戸市外国語大学大学院')) {
        return '神戸市外国語大学大学院';
    }
    if (name.startsWith('東京テクニカルカレッジ') || name.startsWith('専門学校東京テクニカルカレッジ')) {
        return '東京テクニカルカレッジ';
    }
    if (name.startsWith('東京工科自動車大学校') || name.startsWith('専門学校東京工科自動車大学校')) {
        return '東京工科自動車大学校';
    }

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
        '愛甲学院専門学校AO': '愛甲学院専門学校',
        '愛甲学院専門学校ＡＯ': '愛甲学院専門学校',
        'ICT': 'ICT専門学校',
        'ICT専門学校': 'ICT専門学校',
        '関西国際旅行ホテル専門学校': '関西国際旅行・ホテル専門学校',
        '関西国際旅行・ホテル専門学校': '関西国際旅行・ホテル専門学校',
        'トヨタ自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ自動車大学校神戸校': 'トヨタ自動車大学校神戸校',
        '大原': '大原簿記専門学校',
        '大原簿記専門学校三宮校': '大原簿記専門学校',
        '専門学校大原学園神戸校': '大原簿記専門学校',
        '大原学園東京校': '大原簿記専門学校',
        '大原簿記専門学校': '大原簿記専門学校',
        '日本コンピュータ': '日本コンピュータ専門学校',
        '日本コンピュータ専門学校': '日本コンピュータ専門学校',
        '和歌山福祉専門学校': '和歌山社会福祉専門学校',
        '和歌山社会福祉専門学校': '和歌山社会福祉専門学校',
        '駿台観光&外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
        '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
        '中日本自動車短期大学': '中日本自動車短期大学',
        '中日本自動車': '中日本自動車短期大学',
        '長岡公務員・情報ビジネス': '長岡公務員情報ビジネス専門学校',
        '長岡公務員情報ビジネス専門学校': '長岡公務員情報ビジネス専門学校',
        'GIA専門学校新潟国際自動車大学校': '新潟国際自動車大学校',
        '新潟国際自動車大学校': '新潟国際自動車大学校',
        '西日本アカデミー': '西日本アカデミー航空専門学校',
        '西日本アカデミー航空専門学校': '西日本アカデミー航空専門学校',
        '花壇自動車大学校': '専門学校花壇自動車大学校',
        '専門学校花壇自動車大学校': '専門学校花壇自動車大学校',
        '日本マンガ芸術学院': '専門学校日本マンガ芸術学院',
        '専門学校日本マンガ芸術学院': '専門学校日本マンガ芸術学院',
        '国際工科専門学校': '日本国際工科専門学校',
        '日本国際工科専門学校': '日本国際工科専門学校',
        '日本デジタルカレッジ': '専門学校日本デジタルカレッジ',
        '専門学校日本デジタルカレッジ': '専門学校日本デジタルカレッジ'
    };

    return mapping[name] || name;
};

// Check if destination is an actual school name
const isSchoolName = (name) => {
    if (!name) return false;
    const nonSchools = [
        '就職', '帰国予定', '帰国', '特定活動ビザ', '就職予定', '未定', '失踪',
        '家族滞在', '特定活動', '帰国？', '進学以外', '進学未定', '留学国変更',
        '転校', '短期大学', 'その他', '進学希望なし', 'A1', 'A2', 'S', 'B'
    ];
    return !nonSchools.includes(name);
};

const determineCategory = (dest) => {
    if (!dest) return '未定';
    if (['就職', '帰国予定', '帰国', '特定活動ビザ', '就職予定', '未定', '失踪', '家族滞在'].includes(dest)) {
        return dest;
    }
    if (dest === '特定活動') return '特定活動ビザ';
    if (dest === '帰国？') return '帰国';
    if (dest === '進学以外') return '未定';
    if (dest.includes('大学院') || dest.includes('研究生')) {
        return '大学院';
    }
    if (dest.includes('短期大学')) {
        return '短期大学';
    }
    if (dest.includes('大学') && !dest.includes('大学校')) {
        return '大学';
    }
    return '専門学校';
};

// Helper to clean up student names for matching
const cleanName = (name) => {
    if (!name) return '';
    return String(name).replace(/\s+/g, '').toUpperCase().trim();
};

async function run() {
    console.log('1. Fetching student nationality list from Supabase...');
    const { data: dbStudents, error: dbError } = await supabase
        .from('students')
        .select('student_id_text, full_name, nationality');

    if (dbError) {
        console.error('Error fetching students from DB:', dbError.message);
        process.exit(1);
    }

    const studentNationalityMap = {};
    const dbNameToIdMap = {};

    dbStudents.forEach(s => {
        studentNationalityMap[s.student_id_text] = s.nationality || 'Unknown';
        const cName = cleanName(s.full_name);
        if (cName) {
            dbNameToIdMap[cName] = s.student_id_text;
        }
    });
    console.log(`Loaded ${dbStudents.length} students from Supabase.`);

    // 2. Build 2017 Name -> ID Map from old 2017 Excel
    console.log('\n2. Building 2017 Name-to-ID mapping from old file...');
    const old2017Path = path.join(__dirname, '../../lms-kobe-gaigo-data/卒業生進路一覧/2017年度入学生進路一覧.xlsx');
    const nameToId2017 = {};
    if (fs.existsSync(old2017Path)) {
        const wbOld = XLSX.readFile(old2017Path);
        const wsOld = wbOld.Sheets[wbOld.SheetNames[0]];
        const oldRows = XLSX.utils.sheet_to_json(wsOld);
        oldRows.forEach(row => {
            const id = String(row['学籍番号'] || '').trim();
            const name = String(row['氏名'] || '').trim();
            if (id && name) {
                nameToId2017[cleanName(name)] = id;
            }
        });
        console.log(`Created 2017 map with ${Object.keys(nameToId2017).length} names.`);
    } else {
        console.warn('Old 2017 file not found at:', old2017Path);
    }

    // 3. Process each year's Excel file
    console.log('\n3. Processing yearly Excel files...');
    const allStudentDestinations = {}; // { studentId: { name, year, destination, enrolled } }
    const studentPassedSchools = {}; // { studentId: { [schoolName]: enrolled (boolean) } }
    const yearlyTrendMetrics = {}; // { year: { total, graduated, withdrawn, graduationRate, categories: {} } }

    files.forEach(f => {
        const filePath = path.join(__dirname, '../', f.name);
        if (!fs.existsSync(filePath)) {
            console.error(`[CRITICAL] File not found: ${f.name}`);
            process.exit(1);
        }

        console.log(`\nProcessing: ${f.name} (${f.year}年度)`);
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const yearStudents = []; // Store students processed in this year

        if (f.year === 2017) {
            // Unique structure for 2017 (multiple class tables stacked vertically)
            let currentClass = '';
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                // Detect header row
                if (row[0] === 'クラス' && (row[2] === '名前' || row[2] === '氏名')) {
                    continue; // Skip header row
                }

                const firstCell = String(row[0] || '').trim();
                // Check if it's a class header label (e.g. "A1クラス　　　　　進学...")
                if (firstCell.includes('クラス') && !row[2]) {
                    const match = firstCell.match(/([A-Z0-9\-]+)クラス/i);
                    if (match) {
                        currentClass = match[1];
                    }
                    continue;
                }

                // If class matches A1, A2 etc. and we have a name and destination
                const classCode = row[0] ? String(row[0]).trim() : '';
                const num = row[1];
                const rawName = row[2];
                const rawDest = row[3];

                if (classCode && num && rawName) {
                    const name = String(rawName).trim();
                    const dest = rawDest ? String(rawDest).trim() : '';

                    // Resolve student ID
                    const cName = cleanName(name);
                    let sId = nameToId2017[cName] || dbNameToIdMap[cName];
                    if (!sId) {
                        sId = `17_${classCode}_${num}`;
                    }

                    yearStudents.push({
                        id: sId,
                        name: name,
                        rawDestination: dest,
                        isDecided: true, // For 2017, the record list contains their final destination
                        passedSchools: dest && isSchoolName(normalizeDestination(dest)) ? [{ school: normalizeDestination(dest), enrolled: true }] : []
                    });
                }
            }
        }
        else if (f.year >= 2018 && f.year <= 2022) {
            // Find header row with "学籍番号"
            let headerRowIdx = -1;
            for (let i = 0; i < Math.min(15, rows.length); i++) {
                if (rows[i] && rows[i].includes('学籍番号')) {
                    headerRowIdx = i;
                    break;
                }
            }

            if (headerRowIdx === -1) {
                console.error(`Could not find header row in ${f.name}`);
                process.exit(1);
            }

            const header = rows[headerRowIdx];
            const sIdIdx = header.indexOf('学籍番号');
            const nameIdx = header.indexOf('氏名');
            const destIdx = header.indexOf('学校名');
            const decidedIdx = header.indexOf('進路決定');
            const pathIdx = header.indexOf('進路');

            for (let i = headerRowIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const studentId = row[sIdIdx];
                if (!studentId || isNaN(Number(studentId))) continue;
                const sId = String(studentId).trim();
                const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
                const schoolName = row[destIdx] ? String(row[destIdx]).trim() : '';
                const isDecided = row[decidedIdx] === '○';
                const otherPath = row[pathIdx] ? String(row[pathIdx]).trim() : '';

                // Determine final destination
                let dest = '';
                let finalDecided = false;
                if (isDecided && schoolName) {
                    dest = normalizeDestination(schoolName);
                    finalDecided = true;
                } else if (otherPath) {
                    dest = normalizeDestination(otherPath);
                } else if (schoolName) {
                    dest = normalizeDestination(schoolName);
                }

                const passedSchools = [];
                if (schoolName && isSchoolName(normalizeDestination(schoolName))) {
                    passedSchools.push({
                        school: normalizeDestination(schoolName),
                        enrolled: isDecided
                    });
                }

                yearStudents.push({
                    id: sId,
                    name: name,
                    rawDestination: dest,
                    isDecided: finalDecided,
                    passedSchools: passedSchools
                });
            }
        }
        else if (f.year === 2023 || f.year === 2024) {
            // Header is at Row 0
            const header = rows[0];
            const sIdIdx = header.indexOf('学籍番号');
            const nameIdx = header.indexOf('氏名');
            const enrolledIdx = header.indexOf('進学先');
            const finalPassIdx = header.indexOf('最終合格校');
            const careerTypeIdx = header.indexOf('進路区分');

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const studentId = row[sIdIdx];
                if (!studentId || isNaN(Number(studentId))) continue;
                const sId = String(studentId).trim();
                const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
                const enrolledSchool = row[enrolledIdx] ? String(row[enrolledIdx]).trim() : '';
                const finalPassSchool = row[finalPassIdx] ? String(row[finalPassIdx]).trim() : '';
                const careerType = row[careerTypeIdx] ? String(row[careerTypeIdx]).trim() : '';

                let dest = '';
                let isDecided = false;
                if (enrolledSchool) {
                    dest = normalizeDestination(enrolledSchool);
                    isDecided = true;
                } else if (careerType) {
                    dest = normalizeDestination(careerType);
                } else if (finalPassSchool) {
                    dest = normalizeDestination(finalPassSchool);
                }

                const passedSchools = [];
                const normEnrolled = enrolledSchool ? normalizeDestination(enrolledSchool) : '';
                const normFinalPass = finalPassSchool ? normalizeDestination(finalPassSchool) : '';

                if (normEnrolled && isSchoolName(normEnrolled)) {
                    passedSchools.push({ school: normEnrolled, enrolled: true });
                }

                // If final pass is different from enrolled and is a valid school name, add it as enrolled: false
                if (normFinalPass && isSchoolName(normFinalPass) && normFinalPass !== normEnrolled) {
                    passedSchools.push({ school: normFinalPass, enrolled: false });
                }

                yearStudents.push({
                    id: sId,
                    name: name,
                    rawDestination: dest,
                    isDecided: isDecided,
                    passedSchools: passedSchools
                });
            }
        }
        else if (f.year === 2025) {
            // 2025 structure
            // Columns: 学籍番号(0), 氏名(2), 学校名(3), 状況(5), 進学以外(8), 進路決定(9)
            // Header is at row 5
            const headerRowIdx = 5;
            const header = rows[headerRowIdx];
            const sIdIdx = header.indexOf('学籍番号');
            const nameIdx = header.indexOf('氏名');
            const schoolIdx = header.indexOf('学校名');
            const statusIdx = header.indexOf('状況');
            const otherIdx = header.indexOf('進学以外');
            const decidedIdx = header.indexOf('進路決定');

            // Map student ID to their final decision
            const studentDecisions = {};
            const studentRawPasses = [];

            for (let i = headerRowIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const studentId = row[sIdIdx];
                if (!studentId || isNaN(Number(studentId))) continue;
                const sId = String(studentId).trim();
                const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
                const schoolName = row[schoolIdx] ? String(row[schoolIdx]).trim() : '';
                const status = row[statusIdx] ? String(row[statusIdx]).trim() : '';
                const otherPath = row[otherIdx] ? String(row[otherIdx]).trim() : '';
                const isDecided = row[decidedIdx] === '○';

                if (!studentDecisions[sId]) {
                    studentDecisions[sId] = {
                        id: sId,
                        name: name,
                        destination: '',
                        isDecided: false
                    };
                }

                if (isDecided && schoolName) {
                    studentDecisions[sId].destination = normalizeDestination(schoolName);
                    studentDecisions[sId].isDecided = true;
                } else if (!studentDecisions[sId].isDecided && otherPath) {
                    studentDecisions[sId].destination = normalizeDestination(otherPath);
                }

                if (schoolName) {
                    const normSchool = normalizeDestination(schoolName);
                    const isPass = (isDecided || status === '合格' || status === '辞退');
                    if (isPass) {
                        studentRawPasses.push({
                            sId: sId,
                            school: normSchool,
                            enrolled: isDecided
                        });
                    }
                }
            }

            // Convert to yearStudents format
            Object.keys(studentDecisions).forEach(sId => {
                const s = studentDecisions[sId];
                const passesForStudent = studentRawPasses
                    .filter(p => p.sId === sId)
                    .map(p => ({ school: p.school, enrolled: p.enrolled }));

                // Keep only the enrolled entry if duplicates exist for a school
                const uniquePasses = {};
                passesForStudent.forEach(p => {
                    if (!uniquePasses[p.school] || p.enrolled) {
                        uniquePasses[p.school] = p.enrolled;
                    }
                });

                const formattedPasses = Object.keys(uniquePasses).map(school => ({
                    school,
                    enrolled: uniquePasses[school]
                }));

                yearStudents.push({
                    id: sId,
                    name: s.name,
                    rawDestination: s.destination,
                    isDecided: s.isDecided,
                    passedSchools: formattedPasses
                });
            });
        }

        // Aggregate statistics for this year
        let graduatedCount = 0;
        const categoriesCount = {};

        yearStudents.forEach(s => {
            const cat = determineCategory(s.rawDestination);
            categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;

            // Check if student graduated (any valid destination or explicit graduating status)
            if (s.rawDestination) {
                graduatedCount++;
            }

            // Save to master student destination mapping
            const nationality = studentNationalityMap[s.id] || 'Unknown';
            allStudentDestinations[s.id] = {
                name: s.name,
                year: f.year,
                destination: s.rawDestination,
                nationality: nationality
            };

            // Process passes for topDestinations
            s.passedSchools.forEach(p => {
                if (!studentPassedSchools[s.id]) {
                    studentPassedSchools[s.id] = {};
                }
                if (!studentPassedSchools[s.id][p.school] || p.enrolled) {
                    studentPassedSchools[s.id][p.school] = p.enrolled;
                }
            });
        });

        yearlyTrendMetrics[f.year] = {
            year: f.year,
            total: yearStudents.length,
            graduated: graduatedCount,
            withdrawn: yearStudents.length - graduatedCount,
            graduationRate: yearStudents.length > 0 ? parseFloat(((graduatedCount / yearStudents.length) * 100).toFixed(1)) : 0,
            categories: categoriesCount
        };

        console.log(`  Processed ${yearStudents.length} students. Graduated: ${graduatedCount}.`);
    });

    // 4. Load JLPT Exam results from local Excel
    console.log('\n4. Loading JLPT exam results from local Excel database...');
    const jlptExcelPath = path.join(__dirname, '../../lms-kobe-gaigo-data/歴代受験結果データベース.xlsx');
    const destinationJlptStats = {}; // { normalizedSchoolName: { level: { passed: [scores], failed: [scores] } } }

    if (fs.existsSync(jlptExcelPath)) {
        const wb = XLSX.readFile(jlptExcelPath);
        const ws = wb.Sheets['歴代受験記録'];
        if (ws) {
            const jlptRows = XLSX.utils.sheet_to_json(ws);
            console.log(`Loaded ${jlptRows.length} exam entries.`);

            jlptRows.forEach(row => {
                const id = row['学籍番号'] ? String(row['学籍番号']).trim() : '';
                const level = row['レベル'] ? String(row['レベル']).trim() : '';
                const score = parseInt(row['得点']);
                const result = row['合否'] ? String(row['合否']).trim() : '';

                if (id && level && !isNaN(score)) {
                    // Check if this student passed/failed a school in our records
                    const passedObj = studentPassedSchools[id];
                    if (passedObj) {
                        Object.keys(passedObj).forEach(schoolName => {
                            if (!destinationJlptStats[schoolName]) {
                                destinationJlptStats[schoolName] = {};
                            }
                            if (!destinationJlptStats[schoolName][level]) {
                                destinationJlptStats[schoolName][level] = { passed: [], failed: [] };
                            }

                            if (result === '合格') {
                                destinationJlptStats[schoolName][level].passed.push(score);
                            } else {
                                destinationJlptStats[schoolName][level].failed.push(score);
                            }
                        });
                    }
                }
            });
        } else {
            console.warn('Sheet "歴代受験記録" not found in JLPT Excel.');
        }
    } else {
        console.warn('JLPT Excel database not found at:', jlptExcelPath);
    }

    // 5. Structure topDestinations and merge with student lists
    console.log('\n5. Structuring top destinations and matching student listings...');
    const topDestinationsMap = {};

    Object.keys(studentPassedSchools).forEach(sId => {
        const schools = studentPassedSchools[sId];
        const sInfo = allStudentDestinations[sId];
        if (!sInfo) return;

        Object.keys(schools).forEach(schoolName => {
            if (!isSchoolName(schoolName)) return; // Exclude non-school categories

            if (!topDestinationsMap[schoolName]) {
                topDestinationsMap[schoolName] = {
                    name: schoolName,
                    count: 0,
                    years: {},
                    students: []
                };
            }

            const enrolled = schools[schoolName];
            topDestinationsMap[schoolName].count++;
            topDestinationsMap[schoolName].years[sInfo.year] = (topDestinationsMap[schoolName].years[sInfo.year] || 0) + 1;
            topDestinationsMap[schoolName].students.push({
                id: isNaN(Number(sId)) ? sId : Number(sId),
                name: sInfo.name,
                year: sInfo.year,
                nationality: sInfo.nationality,
                enrolled: enrolled
            });
        });
    });

    // Compile JLPT statistics for each destination
    const topDestinationsList = Object.values(topDestinationsMap).map(dest => {
        const jlptStats = {};
        const statsObj = destinationJlptStats[dest.name];

        if (statsObj) {
            Object.keys(statsObj).forEach(level => {
                const { passed, failed } = statsObj[level];
                const calcStats = (scores) => {
                    if (scores.length === 0) return null;
                    const sum = scores.reduce((a, b) => a + b, 0);
                    return {
                        count: scores.length,
                        avg: parseFloat((sum / scores.length).toFixed(1)),
                        max: Math.max(...scores),
                        min: Math.min(...scores)
                    };
                };
                const passedStats = calcStats(passed);
                const failedStats = calcStats(failed);

                if (passedStats || failedStats) {
                    jlptStats[level] = {
                        passed: passedStats,
                        failed: failedStats
                    };
                }
            });
        }

        return {
            ...dest,
            jlptStats
        };
    });

    // 6. Build nationalityStats
    console.log('6. Structuring nationality statistics...');
    const nationalityStatsMap = {};

    Object.values(allStudentDestinations).forEach(s => {
        const country = s.nationality || 'Unknown';
        const cat = determineCategory(s.destination);

        if (!nationalityStatsMap[country]) {
            nationalityStatsMap[country] = {
                name: country,
                total: 0,
                categories: {}
            };
        }

        nationalityStatsMap[country].total++;
        nationalityStatsMap[country].categories[cat] = (nationalityStatsMap[country].categories[cat] || 0) + 1;
    });

    const nationalityStatsList = Object.values(nationalityStatsMap).sort((a, b) => b.total - a.total);

    // 7. Re-calculate overall summary metrics
    console.log('7. Re-calculating overall summary metrics...');
    let totalRecords = 0;
    let totalGraduates = 0;
    const overallCategories = {};
    const years = files.map(f => f.year).sort((a, b) => a - b);

    const yearlyTrendsList = Object.values(yearlyTrendMetrics).sort((a, b) => a.year - b.year);
    yearlyTrendsList.forEach(t => {
        totalRecords += t.total;
        totalGraduates += t.graduated;
        Object.keys(t.categories).forEach(cat => {
            overallCategories[cat] = (overallCategories[cat] || 0) + t.categories[cat];
        });
    });

    const finalJsonData = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalRecords,
            totalGraduates,
            years,
            categories: Object.keys(overallCategories)
        },
        categoryStats: overallCategories,
        yearlyTrends: yearlyTrendsList,
        nationalityStats: nationalityStatsList,
        topDestinations: topDestinationsList.sort((a, b) => b.count - a.count)
    };

    console.log('\n--- Output Summary ---');
    console.log('Total Records:', totalRecords);
    console.log('Total Graduates:', totalGraduates);
    console.log('Top Destinations count:', finalJsonData.topDestinations.length);
    console.log('Years included:', finalJsonData.summary.years.join(', '));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalJsonData, null, 2), 'utf8');
    console.log(`\nSuccessfully rebuilt and saved to: ${OUTPUT_PATH}`);
}

run();
