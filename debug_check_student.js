const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStudent() {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', 'test-student')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Student Record:', JSON.stringify(data, null, 2));
    }
}

checkStudent();
