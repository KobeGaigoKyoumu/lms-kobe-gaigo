const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local because dotenv.config() might skip it if values are already set
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = dotenv.parse(envFile);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listStudents() {
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name, facebook_psid')
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Students List:', JSON.stringify(data, null, 2));
    }
}

listStudents();
