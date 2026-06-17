require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
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
        '中日本自動車': '中日本自動車短期大学'
    };

    return mapping[name] || name;
};

// 学籍番号 -> 進路
const studentDestMap = {};

// 6行目 (インデックス5) からデータ開始
for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = row[0];
    const schoolName = row[3];
    const otherPath = row[8];
    const isDecided = row[9];

    if (!studentId || isNaN(Number(studentId))) continue;
    const sId = String(studentId).trim();

    if (!studentDestMap[sId]) {
        studentDestMap[sId] = {
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
}

async function run() {
    const students = Object.keys(studentDestMap);
    console.log(`Loaded ${students.length} students from Excel. Starting database updates...`);

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const sId of students) {
        const dest = studentDestMap[sId].destination;
        if (!dest) {
            console.log(`Student ${sId} has no decided destination, skipping.`);
            continue;
        }

        // Check if student exists in DB
        const { data: student, error: checkError } = await supabase
            .from('students')
            .select('student_id_text, full_name')
            .eq('student_id_text', sId)
            .maybeSingle();

        if (checkError) {
            console.error(`Error checking student ${sId}:`, checkError.message);
            errorCount++;
            continue;
        }

        if (!student) {
            console.warn(`Student ${sId} not found in database.`);
            notFoundCount++;
            continue;
        }

        // Update destination
        const { error: updateError } = await supabase
            .from('students')
            .update({ destination: dest })
            .eq('student_id_text', sId);

        if (updateError) {
            console.error(`Error updating student ${sId} (${student.full_name}):`, updateError.message);
            errorCount++;
        } else {
            console.log(`Updated Student ${sId} (${student.full_name}) -> ${dest}`);
            successCount++;
        }
    }

    console.log('\n=== DB Import Summary ===');
    console.log(`Total matched & updated: ${successCount}`);
    console.log(`Not found in DB: ${notFoundCount}`);
    console.log(`Errors: ${errorCount}`);
}

run();
