const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('Checking student 2504094...');
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, academic_year, full_name, status')
        .eq('student_id_text', '2504094')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Student Data:', JSON.stringify(data, null, 2));
    }
}

check();
