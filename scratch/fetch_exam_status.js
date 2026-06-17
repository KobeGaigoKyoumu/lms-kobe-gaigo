const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. 各statusごとの件数
    const { data: statusCounts, error: err1 } = await supabase
        .from('student_exam_schedules')
        .select('status');
        
    if (err1) {
        console.error('Error fetching exam statuses:', err1);
        return;
    }

    const counts = {};
    statusCounts.forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
    });
    console.log('Exam schedules status counts:', counts);

    // 2. 合格しているデータのサンプル（最大10件）
    const { data: passedExams, error: err2 } = await supabase
        .from('student_exam_schedules')
        .select('student_id, school_name, department_name, status')
        .eq('status', '合格')
        .limit(10);
        
    if (err2) {
        console.error('Error fetching passed exams:', err2);
        return;
    }

    console.log('\nPassed exam sample:', passedExams.length);
    console.table(passedExams);
}

run();
