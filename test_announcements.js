require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper for normalization (simulating normalizeClassName)
function normalizeClassName(name) {
    if (!name) return '';
    return name.toString()
        .replace(/[\uff01-\uff5e]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // 全角 -> 半角
        .replace(/\u3000/g, ' ') // 全角スペース -> 半角スペース
        .replace(/\s+/g, '') // 全スペース削除
        .replace(/\u2010|\u2011|\u2012|\u2013|\u2014|\u2015|\u2212|\uff0d/g, '-') // ハイフン類統一
        .toLowerCase();
}

async function test() {
    const student = {
        studentId: 'test_student',
        className: '1-13',
        academicYear: 2024
    };

    console.log('Testing with student:', student);

    const now = new Date();
    const currentYear = now.getFullYear();
    const isBeforeApril = now.getMonth() < 3;
    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear;
    const studentGrade = (academicYearBase - student.academicYear + 1).toString();
    const normStudentClass = normalizeClassName(student.className);

    console.log(`Grade: ${studentGrade}, NormClass: ${normStudentClass}`);

    const { data, error } = await adminSupabase
        .from('announcements')
        .select('*');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Total announcements: ${data.length}`);

    const filtered = data.filter(a => {
        const type = (a.target_type || 'all').toLowerCase();
        console.log(`Checking [${a.title}] type: ${type}, class: ${a.target_class}, grade: ${a.target_grade}`);

        if (type === 'all') return true;
        if (type === 'grade') return String(a.target_grade) === studentGrade;
        if (type === 'class') {
            const normTargetClass = normalizeClassName(a.target_class || '');
            const match = normTargetClass === normStudentClass;
            console.log(`  Class matching: "${normTargetClass}" === "${normStudentClass}"? ${match}`);
            return match;
        }
        if (type === 'individual' && Array.isArray(a.target_student_ids)) {
            return a.target_student_ids.includes(student.studentId);
        }
        return false;
    });

    console.log(`Filtered result count: ${filtered.length}`);
    filtered.forEach(f => console.log(` - ${f.title}`));
}

test();
