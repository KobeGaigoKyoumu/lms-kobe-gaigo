const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    // APIと同じように学校を検索する（例として「神戸」で検索）
    const q = '神戸';
    console.log(`Searching schools with query: "${q}"`);

    // master_schools から取得（serviceClientを使用）
    const { data: schools, error: schoolsError } = await serviceClient
        .from('master_schools')
        .select('code, name, school_type, prefecture, website, departments')
        .or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%,departments.ilike.%${q}%`)
        .order('name', { ascending: true })
        .range(0, 19);

    if (schoolsError) {
        console.error('Error fetching schools:', schoolsError);
        return;
    }

    console.log(`Fetched ${schools.length} schools.`);
    const schoolNames = schools.map(s => s.name);
    console.log('School names:', schoolNames);

    // 1. Enrollment
    const { data: enrollmentData, error: enrollError } = await serviceClient
        .from('students')
        .select('student_id_text, destination')
        .in('destination', schoolNames);

    if (enrollError) console.error('Enrollment error:', enrollError);

    // 2. Pass
    const { data: passData, error: passError } = await serviceClient
        .from('student_exam_schedules')
        .select('student_id, school_name')
        .in('school_name', schoolNames)
        .eq('status', '合格');

    if (passError) console.error('Pass error:', passError);

    const safeEnrollData = enrollmentData || [];
    const safePassData = passData || [];

    console.log(`Enrollments: ${safeEnrollData.length}, Passes: ${safePassData.length}`);

    // Combine student IDs
    const studentIds = Array.from(new Set([
        ...safeEnrollData.map(d => d.student_id_text),
        ...safePassData.map(p => p.student_id)
    ]));

    console.log('Combined Student IDs:', studentIds);

    let jlptMap = {};
    if (studentIds.length > 0) {
        const { data: jlptData, error: jlptError } = await serviceClient
            .from('grade_records')
            .select('student_id_text, final_exam_data')
            .in('student_id_text', studentIds)
            .like('year_term', 'JLPT %');

        if (jlptError) {
            console.error('JLPT Query Error:', jlptError);
        } else {
            console.log(`JLPT records fetched: ${jlptData.length}`);
            console.log('JLPT records sample:', jlptData.slice(0, 5));
            
            const safeJlptData = jlptData || [];
            const levelWeights = { 'N1': 3, 'N2': 2, 'N3': 1 };

            safeJlptData.forEach(r => {
                const sId = r.student_id_text;
                const examData = r.final_exam_data;
                if (examData && examData.result === '合格') {
                    const lv = examData.level; // 'N1', 'N2', 'N3' など
                    if (levelWeights[lv]) {
                        if (!jlptMap[sId] || levelWeights[lv] > levelWeights[jlptMap[sId]]) {
                            jlptMap[sId] = lv;
                        }
                    }
                }
            });
        }
    }

    console.log('jlptMap:', jlptMap);

    // 学校ごとにマージ
    schools.forEach(school => {
        const schoolEnrollStudents = safeEnrollData
            .filter(d => d.destination === school.name)
            .map(d => d.student_id_text);
        const schoolPassStudents = safePassData
            .filter(p => p.school_name === school.name)
            .map(p => p.student_id);

        const uniqueStudents = Array.from(new Set([...schoolEnrollStudents, ...schoolPassStudents]));

        if (uniqueStudents.length > 0) {
            let n1Count = 0;
            let n2Count = 0;
            let n3Count = 0;

            uniqueStudents.forEach(sId => {
                const maxLevel = jlptMap[sId];
                if (maxLevel === 'N1') n1Count++;
                else if (maxLevel === 'N2') n2Count++;
                else if (maxLevel === 'N3') n3Count++;
            });

            const totalWithJlpt = n1Count + n2Count + n3Count;
            const totalStudents = uniqueStudents.length;

            console.log(`School: ${school.name}`);
            console.log(`  Total: ${totalStudents}, N1: ${n1Count}, N2: ${n2Count}, N3: ${n3Count}`);
            console.log(`  overN3_rate: ${(totalWithJlpt / totalStudents * 100).toFixed(1)}%`);
        }
    });
}

main();
