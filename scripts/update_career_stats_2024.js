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

const filePath = path.join(__dirname, '../2025年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['進路状況入力シート'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

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
        '関西国際旅行・ホテル専門学校': '関西国際旅行・ホテル専門学校',
        'トヨタ自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ自動車大学校神戸校': 'トヨタ自動車大学校神戸校',
        '大原': '大原簿記専門学校三宮校',
        '大原簿記専門学校三宮校': '大原簿記専門学校三宮校',
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
    // Default
    return '専門学校';
};

// 学籍番号 -> 進路
const studentDestMap = {};
// 学生ID -> { [schoolName]: enrolled (boolean) }
const studentPassedSchools = {};

for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = row[0];
    const name = row[2];
    const schoolName = row[3];
    const otherPath = row[8];
    const isDecided = row[9];
    const status = row[5];

    if (!studentId || isNaN(Number(studentId))) continue;
    const sId = String(studentId).trim();

    if (!studentDestMap[sId]) {
        studentDestMap[sId] = {
            id: sId,
            name: name || '',
            destination: '',
            isDecided: false
        };
    }

    if (isDecided === '○' && schoolName) {
        studentDestMap[sId].destination = normalizeDestination(schoolName);
        studentDestMap[sId].isDecided = true;
    } else if (!studentDestMap[sId].isDecided && otherPath) {
        studentDestMap[sId].destination = normalizeDestination(otherPath);
    }

    // 合格実績（進学校＋未進学合格校）の抽出
    if (schoolName) {
        const normalizedSchool = normalizeDestination(schoolName);
        const isPass = (isDecided === '○' || status === '合格' || status === '辞退');
        if (isPass) {
            if (!studentPassedSchools[sId]) {
                studentPassedSchools[sId] = {};
            }
            const isEnrolled = (isDecided === '○');
            // 決定進学先（enrolled: true）を優先して登録・更新する
            if (!studentPassedSchools[sId][normalizedSchool] || isEnrolled) {
                studentPassedSchools[sId][normalizedSchool] = isEnrolled;
            }
        }
    }
}

async function run() {
    console.log('Fetching student nationalities from Supabase...');
    const { data: dbStudents, error } = await supabase
        .from('students')
        .select('student_id_text, nationality');

    if (error) {
        console.error('Error fetching students:', error.message);
        process.exit(1);
    }

    const studentNationalityMap = {};
    dbStudents.forEach(s => {
        studentNationalityMap[s.student_id_text] = s.nationality || 'Unknown';
    });

    console.log('Loading existing career stats...');
    const rawJson = fs.readFileSync(OUTPUT_PATH, 'utf8');
    const data = JSON.parse(rawJson);

    // Build 2025 student list
    const students2025 = [];
    Object.keys(studentDestMap).forEach(sId => {
        const s = studentDestMap[sId];
        const nationality = studentNationalityMap[sId] || 'Unknown';
        students2025.push({
            id: sId,
            name: s.name,
            destination: s.destination,
            nationality: nationality
        });
    });

    console.log(`Aggregating stats for ${students2025.length} students in 2025...`);

    // 1. Update summary
    if (!data.summary.years.includes(2025)) {
        data.summary.years.push(2025);
        data.summary.years.sort((a, b) => a - b);
    }

    // Reset 2025 counts in overall variables to prevent duplicate aggregation if re-run
    
    // Calculate 2025 metrics
    const categoriesCount = {};
    let graduatedCount = 0;
    
    students2025.forEach(s => {
        const cat = determineCategory(s.destination);
        categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
        // Consider student graduated if they have a destination set (even non-school like 就職, 帰国 etc)
        if (s.destination) {
            graduatedCount++;
        }
    });

    // Remove existing 2025 trend if exists
    data.yearlyTrends = data.yearlyTrends.filter(t => t.year !== 2025);
    // Push new 2025 trend
    data.yearlyTrends.push({
        year: 2025,
        total: students2025.length,
        graduated: graduatedCount,
        withdrawn: students2025.length - graduatedCount,
        graduationRate: parseFloat(((graduatedCount / students2025.length) * 100).toFixed(1)),
        categories: categoriesCount
    });
    data.yearlyTrends.sort((a, b) => a.year - b.year);

    // Re-calculate overall summary and categories
    // This is safer to calculate based on all yearlyTrends
    let totalRecords = 0;
    let totalGraduates = 0;
    const overallCategories = {};

    data.yearlyTrends.forEach(t => {
        totalRecords += t.total;
        totalGraduates += t.graduated;
        Object.keys(t.categories).forEach(cat => {
            overallCategories[cat] = (overallCategories[cat] || 0) + t.categories[cat];
        });
    });

    data.summary.totalRecords = totalRecords;
    data.summary.totalGraduates = totalGraduates;
    data.categoryStats = overallCategories;

    // 2. Update nationalityStats
    
    // Clear 2025 data from topDestinations
    data.topDestinations.forEach(dest => {
        if (dest.years && dest.years['2025']) {
            dest.count -= dest.years['2025'];
            delete dest.years['2025'];
        }
        if (dest.students) {
            dest.students = dest.students.filter(s => s.year !== 2025);
        }
    });

    // Now merge 2025 students into topDestinations based on studentPassedSchools
    Object.keys(studentPassedSchools).forEach(sId => {
        const schools = studentPassedSchools[sId];
        const studentInfo = studentDestMap[sId];
        const sName = studentInfo ? studentInfo.name : '';
        const nationality = studentNationalityMap[sId] || 'Unknown';

        Object.keys(schools).forEach(destName => {
            const enrolled = schools[destName];

            let destObj = data.topDestinations.find(d => d.name === destName);
            if (!destObj) {
                destObj = {
                    name: destName,
                    count: 0,
                    years: {},
                    students: []
                };
                data.topDestinations.push(destObj);
            }
            destObj.count++;
            destObj.years['2025'] = (destObj.years['2025'] || 0) + 1;
            destObj.students.push({
                id: Number(sId),
                name: sName,
                year: 2025,
                nationality: nationality,
                enrolled: enrolled
            });
        });
    });

    // Remove destinations that have count 0
    data.topDestinations = data.topDestinations.filter(d => d.count > 0);
    // Sort topDestinations by count descending
    data.topDestinations.sort((a, b) => b.count - a.count);

    const nationality2025 = {}; // { Country: { total: 0, categories: {} } }
    students2025.forEach(s => {
        const cat = determineCategory(s.destination);
        const country = s.nationality || 'Unknown';
        if (!nationality2025[country]) {
            nationality2025[country] = { total: 0, categories: {} };
        }
        nationality2025[country].total++;
        nationality2025[country].categories[cat] = (nationality2025[country].categories[cat] || 0) + 1;
    });

    Object.keys(nationality2025).forEach(country => {
        let natObj = data.nationalityStats.find(n => n.name === country);
        if (!natObj) {
            natObj = { name: country, total: 0, categories: {} };
            data.nationalityStats.push(natObj);
        }
        natObj.total += nationality2025[country].total;
        Object.keys(nationality2025[country].categories).forEach(cat => {
            natObj.categories[cat] = (natObj.categories[cat] || 0) + nationality2025[country].categories[cat];
        });
    });

    data.generatedAt = new Date().toISOString();

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully updated career_stats_v2.json with 2025 data.');
}

run();
