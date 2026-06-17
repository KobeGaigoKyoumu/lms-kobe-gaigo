const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('Missing Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Querying student_career_info...');
    try {
        const { data, error, count } = await supabase
            .from('student_career_info')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching student_career_info:', error.message);
        } else {
            console.log('Sample record keys:', Object.keys(data[0] || {}));
            console.log('Sample record details:', JSON.stringify(data[0] || null, null, 2));
        }
    } catch (e) {
        console.error('Unexpected error:', e.message);
    }
}

run();
