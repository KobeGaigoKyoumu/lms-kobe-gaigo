const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple env parser
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Students in DB:', JSON.stringify(data, null, 2));
    }
}

check();
