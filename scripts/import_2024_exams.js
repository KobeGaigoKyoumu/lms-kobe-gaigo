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
        'and和歌山社会福祉専門学校': '和歌山社会福祉専門学校',
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

// 1. Excelから全受験スケジュールをロード
const examSchedules = [];
const targetStudents = new Set();

// 6行目 (インデックス5) からデータ開始
for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = row[0];
    const rawSchoolName = row[3];
    const departmentName = row[4];
    const rawStatus = row[5];
    const examDate = row[6];
    const resultsDate = row[7];
    const isDecided = row[9]; // 進路決定フラグ

    if (!studentId || isNaN(Number(studentId))) continue;
    const sId = String(studentId).trim();
    targetStudents.add(sId);

    // 学校名がない場合はその他進路（就職・帰国等）であるため、スケジュールには登録しない
    if (!rawSchoolName) continue;

    const schoolName = normalizeDestination(rawSchoolName);

    // 状況の判定
    let status = '結果待ち';
    if (isDecided === '○') {
        status = '合格'; // 進学確定している場合は合格
    } else if (rawStatus === '合格') {
        status = '辞退'; // 合格したが決定ではない場合、辞退（または合格したまま進学しなかった）扱いとする
    } else if (rawStatus === '不合格') {
        status = '不合格';
    } else if (rawStatus === '辞退') {
        status = '辞退';
    } else if (rawStatus === '未受験') {
        status = '未受験';
    } else if (rawStatus === '試験待ち') {
        status = '結果待ち';
    }

    examSchedules.push({
        student_id: sId,
        school_name: schoolName,
        department_name: departmentName ? String(departmentName).trim() : null,
        exam_date: examDate ? String(examDate).trim() : null,
        results_date: resultsDate ? String(resultsDate).trim() : null,
        status: status
    });
}

async function run() {
    const studentList = Array.from(targetStudents);
    console.log(`Excel has ${studentList.length} students with ${examSchedules.length} exam records.`);
    
    // DB内の2024年度関連生徒の古いスケジュールレコードを一旦削除して、再インポート（重複防止）
    console.log('Clearing old exam schedules for the 2024 students in DB...');
    const { error: deleteError } = await supabase
        .from('student_exam_schedules')
        .delete()
        .in('student_id', studentList);

    if (deleteError) {
        console.error('Error clearing old records:', deleteError.message);
        process.exit(1);
    }
    console.log('Old records cleared.');

    // バッチ（複数）挿入を実行（通信量の節約のため1回で送信）
    console.log(`Inserting ${examSchedules.length} new exam schedules...`);
    const { error: insertError } = await supabase
        .from('student_exam_schedules')
        .insert(examSchedules);

    if (insertError) {
        console.error('Error inserting records:', insertError.message);
        process.exit(1);
    }

    console.log('\n=== DB Exam Import Completed Successfully ===');
    console.log(`Total exam schedules inserted: ${examSchedules.length}`);
}

run();
