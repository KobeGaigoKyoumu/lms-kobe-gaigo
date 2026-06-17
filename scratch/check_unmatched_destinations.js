const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(name) {
    if (!name) return '';
    return name
        .replace(/[\s\u3000]/g, '') // スペース除去
        .replace(/[\-\-\—\–\─\━]/g, '') // ハイフン類除去
        .replace(/[a-zA-Z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0)) // 半角英数字を全角に
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
}

async function main() {
    console.log('Fetching master schools...');
    const { data: dbSchools } = await supabase
        .from('master_schools')
        .select('name');
    
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

    console.log('Fetching student destinations...');
    const { data: students } = await supabase
        .from('students')
        .select('destination')
        .not('destination', 'is', null);

    const studentDests = Array.from(new Set(students.map(s => s.destination)));

    console.log('Fetching exam schedule school names...');
    const { data: exams } = await supabase
        .from('student_exam_schedules')
        .select('school_name')
        .not('school_name', 'is', null);

    const examSchools = Array.from(new Set(exams.map(e => e.school_name)));

    console.log(`Unique destinations: ${studentDests.length}`);
    console.log(`Unique exam school names: ${examSchools.length}`);

    // 表記ゆれチェック
    console.log('\n--- Checking destinations ---');
    let unmatchedDestCount = 0;
    studentDests.forEach(dest => {
        if (!dbSchoolSet.has(dest)) {
            unmatchedDestCount++;
            // マッチ候補を探す
            let candidate = null;
            const norm = normalizeName(dest);
            
            // スペース除去一致
            const spacedOut = dest.replace(/[\s\u3000]/g, '');
            const candidate1 = dbSchoolNames.find(s => s.replace(/[\s\u3000]/g, '') === spacedOut);
            
            if (candidate1) candidate = candidate1;
            else if (dbNormMap.has(norm)) candidate = dbNormMap.get(norm);
            else {
                for (const [dbNorm, dbName] of dbNormMap.entries()) {
                    if (dbNorm.length >= 3 && norm.length >= 3) {
                        if (norm.includes(dbNorm) || dbNorm.includes(norm)) {
                            candidate = dbName;
                            break;
                        }
                    }
                }
            }

            if (unmatchedDestCount <= 20) {
                console.log(`Unmatched destination: "${dest}" -> Candidate: "${candidate || 'None'}"`);
            }
        }
    });
    console.log(`Total unmatched destinations: ${unmatchedDestCount}`);

    console.log('\n--- Checking exam school names ---');
    let unmatchedExamCount = 0;
    examSchools.forEach(es => {
        if (!dbSchoolSet.has(es)) {
            unmatchedExamCount++;
            let candidate = null;
            const norm = normalizeName(es);
            
            const spacedOut = es.replace(/[\s\u3000]/g, '');
            const candidate1 = dbSchoolNames.find(s => s.replace(/[\s\u3000]/g, '') === spacedOut);
            
            if (candidate1) candidate = candidate1;
            else if (dbNormMap.has(norm)) candidate = dbNormMap.get(norm);
            else {
                for (const [dbNorm, dbName] of dbNormMap.entries()) {
                    if (dbNorm.length >= 3 && norm.length >= 3) {
                        if (norm.includes(dbNorm) || dbNorm.includes(norm)) {
                            candidate = dbName;
                            break;
                        }
                    }
                }
            }

            if (unmatchedExamCount <= 20) {
                console.log(`Unmatched exam school: "${es}" -> Candidate: "${candidate || 'None'}"`);
            }
        }
    });
    console.log(`Total unmatched exam schools: ${unmatchedExamCount}`);
}

main();
