const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    // There is no easy way to list tables via client without RPC.
    // Try some common table names
    const tables = ['students', 'careers', 'student_careers', 'jlpt_results', 'attendance', 'grades'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table}: Not found or Error: ${error.message}`);
        } else {
            console.log(`Table ${table}: Found! Columns: ${Object.keys(data[0] || {}).join(', ')}`);
        }
    }
}
check();
