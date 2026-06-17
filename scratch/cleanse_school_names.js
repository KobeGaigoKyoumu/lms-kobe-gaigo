const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 全角半角の標準化関数
function stdChar(str) {
    if (!str) return '';
    return str
        .replace(/[\s\u3000]/g, '') // スペース除去
        .replace(/[A-Za-z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0)) // 半角英数字を全角に
        .replace(/－|ー|—|–|─|━/g, 'ー') // ハイフンの統一
        .toLowerCase();
}

function normalizeName(name) {
    if (!name) return '';
    let n = stdChar(name)
        .replace(/[\(\)（）]/g, '') // カッコ除去
        .replace(/学校法人/g, '')
        .replace(/専修学校/g, '')
        .replace(/専門学校/g, '')
        .replace(/工業専門/g, '')
        .replace(/医療専門/g, '')
        .replace(/商業実務/g, '')
        .replace(/高等専門/g, '')
        .replace(/学園/g, '')
        .replace(/学院/g, '')
        .replace(/大学校/g, '')
        .replace(/短期大学部/g, '')
        .replace(/短期大学/g, '')
        .replace(/大学/g, '');
    return n;
}

// 手動マッピング辞書（自動判定でNoneになる、または誤判定しやすいものを補正）
const manualMapping = {
    'トヨタ自動車大学校神戸校': '専門学校トヨタ神戸自動車大学校',
    'トヨタ神戸自動車大学校': '専門学校トヨタ神戸自動車大学校',
    '栃木グローバルビジネスカレッジ': '専門学校栃木グローバルビジネスカレッジ',
    '国際外語観光エアライン専門学校': '国際外語・観光・エアライン専門学校',
    '東京みらいit&ai専門学校': '東京みらいｉｔ＆ａｉ専門学校',
    '東京みらいIT&AI専門学校': '東京みらいｉｔ＆ａｉ専門学校',
    '大原学園東京校': '大原簿記学校', // 東京の総本山
    'マツダ自動車大学': 'マツダ技術短期大学校',
    '京都情報コンピュータ専門学校': '京都情報大学院大学', // 関連校
};

async function main() {
    console.log('Fetching master schools...');
    const { data: dbSchools, error: dbErr } = await supabase
        .from('master_schools')
        .select('name');
    
    if (dbErr) {
        console.error('Error fetching master schools:', dbErr.message);
        return;
    }

    const dbSchoolNames = dbSchools.map(s => s.name);
    const dbSchoolSet = new Set(dbSchoolNames);
    
    // DB学校のノーマライズネームマップ
    const dbNormMap = new Map();
    dbSchools.forEach(s => {
        const norm = normalizeName(s.name);
        if (norm) {
            dbNormMap.set(norm, s.name);
        }
    });

    // 標準化（スペース・大文字小文字など除去）マップ
    const dbStdMap = new Map();
    dbSchools.forEach(s => {
        const std = stdChar(s.name);
        if (std) {
            dbStdMap.set(std, s.name);
        }
    });

    // マッチング判定関数
    function findBestMatch(originalName) {
        if (!originalName) return null;
        const trimmed = originalName.trim();
        if (!trimmed) return null;

        // 除外キーワード（これらは学校ではない）
        const skipKeywords = ['就職', '帰国', '退学', '除籍', '家族滞在', 'その他', '未定', '進学準備', 'アルバイト', '自営業'];
        if (skipKeywords.some(k => trimmed.includes(k))) {
            return null;
        }

        // 1. 完全一致
        if (dbSchoolSet.has(trimmed)) {
            return trimmed;
        }

        // 2. 手動マッピング
        if (manualMapping[trimmed]) {
            return manualMapping[trimmed];
        }

        // 3. 標準化一致 (スペース除去、半角全角統一等)
        const std = stdChar(trimmed);
        if (dbStdMap.has(std)) {
            return dbStdMap.get(std);
        }

        // 4. ノーマライズ一致 (プレフィックス/サフィックス除去)
        const norm = normalizeName(trimmed);
        if (dbNormMap.has(norm)) {
            return dbNormMap.get(norm);
        }

        // 5. ノーマライズ部分一致（包含関係、文字数3文字以上）
        for (const [dbNorm, dbName] of dbNormMap.entries()) {
            if (dbNorm.length >= 3 && norm.length >= 3) {
                if (norm.includes(dbNorm) || dbNorm.includes(norm)) {
                    return dbName;
                }
            }
        }

        // 6. DB側の名前に元の名前が部分的に含まれるか
        for (const dbName of dbSchoolNames) {
            const dbStd = stdChar(dbName);
            if (std.length >= 4 && dbStd.includes(std)) {
                return dbName;
            }
        }

        return null;
    }

    // --- 1. students テーブルのクレンジング ---
    console.log('\n=== Cleansing students.destination ===');
    const { data: students, error: stErr } = await supabase
        .from('students')
        .select('student_id_text, destination')
        .not('destination', 'is', null);

    if (stErr) {
        console.error('Error fetching students:', stErr.message);
        return;
    }

    console.log(`Found ${students.length} students with destination.`);
    let stUpdateCount = 0;
    
    for (const student of students) {
        const currentDest = student.destination;
        const match = findBestMatch(currentDest);

        if (match && match !== currentDest) {
            console.log(`Student ${student.student_id_text}: "${currentDest}" -> "${match}"`);
            const { error: updErr } = await supabase
                .from('students')
                .update({ destination: match })
                .eq('student_id_text', student.student_id_text);

            if (updErr) {
                console.error(`  Update failed: ${updErr.message}`);
            } else {
                stUpdateCount++;
            }
        }
    }
    console.log(`Successfully updated ${stUpdateCount} students destinations.`);

    // --- 2. student_exam_schedules テーブルのクレンジング ---
    console.log('\n=== Cleansing student_exam_schedules.school_name ===');
    const { data: exams, error: exErr } = await supabase
        .from('student_exam_schedules')
        .select('id, student_id, school_name')
        .not('school_name', 'is', null);

    if (exErr) {
        console.error('Error fetching exam schedules:', exErr.message);
        return;
    }

    console.log(`Found ${exams.length} exam records with school_name.`);
    let exUpdateCount = 0;

    for (const exam of exams) {
        const currentSchool = exam.school_name;
        const match = findBestMatch(currentSchool);

        if (match && match !== currentSchool) {
            console.log(`Exam ${exam.id} (Student ${exam.student_id}): "${currentSchool}" -> "${match}"`);
            const { error: updErr } = await supabase
                .from('student_exam_schedules')
                .update({ school_name: match })
                .eq('id', exam.id);

            if (updErr) {
                console.error(`  Update failed: ${updErr.message}`);
            } else {
                exUpdateCount++;
            }
        }
    }
    console.log(`Successfully updated ${exUpdateCount} exam records.`);
    console.log('\n=== Cleanse Completed ===');
}

main();
