const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const schools = [
        { name: '神戸医療未来大学' },
        { name: '神戸国際大学' }
    ];
    const schoolNames = schools.map(s => s.name);

    // 1. Enrollment
    const { data: enrollmentData } = await serviceClient
        .from('students')
        .select('student_id_text, destination')
        .in('destination', schoolNames);

    // 2. Pass
    const { data: passData } = await serviceClient
        .from('student_exam_schedules')
        .select('student_id, school_name')
        .in('school_name', schoolNames)
        .eq('status', '合格');

    const safeEnrollData = enrollmentData || [];
    const safePassData = passData || [];

    const studentIds = Array.from(new Set([
        ...safeEnrollData.map(d => d.student_id_text),
        ...safePassData.map(p => p.student_id)
    ]));

    let jlptMap = {};
    if (studentIds.length > 0) {
        const { data: jlptData } = await serviceClient
            .from('grade_records')
            .select('student_id_text, final_exam_data')
            .in('student_id_text', studentIds)
            .like('year_term', 'JLPT %');

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

    console.log('--- jlptMap ---');
    console.log(jlptMap);

    schools.forEach(school => {
        const schoolEnrollStudents = safeEnrollData
            .filter(d => d.destination === school.name)
            .map(d => d.student_id_text);
        const schoolPassStudents = safePassData
            .filter(p => p.school_name === school.name)
            .map(p => p.student_id);

        const uniqueStudents = Array.from(new Set([...schoolEnrollStudents, ...schoolPassStudents]));
        
        console.log(`\n--- School: ${school.name} ---`);
        console.log('schoolEnrollStudents:', schoolEnrollStudents);
        console.log('schoolPassStudents:', schoolPassStudents);
        console.log('uniqueStudents:', uniqueStudents);

        if (uniqueStudents.length > 0) {
            let n1Count = 0;
            let n2Count = 0;
            let n3Count = 0;

            uniqueStudents.forEach(sId => {
                const maxLevel = jlptMap[sId];
                console.log(`Student ${sId} maxLevel: ${maxLevel}`);
                if (maxLevel === 'N1') n1Count++;
                else if (maxLevel === 'N2') n2Count++;
                else if (maxLevel === 'N3') n3Count++;
            });

            const totalWithJlpt = n1Count + n2Count + n3Count;
            const totalStudents = uniqueStudents.length;

            console.log(`n1Count: ${n1Count}, n2Count: ${n2Count}, n3Count: ${n3Count}`);
            console.log(`totalWithJlpt: ${totalWithJlpt}, totalStudents: ${totalStudents}`);
            console.log(`overN3_rate: ${(totalWithJlpt / totalStudents * 100).toFixed(1)}%`);
        }
    });
}

main();
