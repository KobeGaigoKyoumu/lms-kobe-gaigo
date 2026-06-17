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
    console.log('Querying students table schema...');
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching student:', error.message);
        } else {
            console.log('Student record keys:', Object.keys(data[0] || {}));
            console.log('Student record sample:', data[0]);
        }
    } catch (e) {
        console.error('Unexpected error:', e.message);
    }
}

run();
