
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkStudents() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, enrollment_date, status')
        .or('status.eq.graduated,status.eq.active');
    
    if (error) {
        console.error(error);
        return;
    }

    const cohorts = {};
    data.forEach(s => {
        if (!s.enrollment_date) return;
        const year = new Date(s.enrollment_date).getFullYear();
        const gradYear = year + 2;
        cohorts[gradYear] = (cohorts[gradYear] || 0) + 1;
    });

    console.log('Cohorts from DB:', cohorts);
}

checkStudents();
