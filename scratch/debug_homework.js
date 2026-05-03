
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const classes = ['1-3', '2-13'];
    
    console.log('--- Assignments ---');
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .in('class_name', classes);
    console.log(assignments);

    console.log('--- Submissions (submitted) ---');
    const { data: submissions } = await supabase
        .from('homework_submissions')
        .select('id, status, assignment:homework_assignments(title, class_name)')
        .eq('status', 'submitted');
    
    const filteredSubmissions = submissions.filter(s => classes.includes(s.assignment?.class_name));
    console.log('Matching Submissions:', filteredSubmissions.length);
    console.log(filteredSubmissions);
}

check();
