const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('Testing connection to Supabase...');
    try {
        // exec_sql RPC があるか、または適当なテーブルからselectしてみる
        const { data, error } = await supabase.from('master_schools').select('*').limit(1);
        if (error) {
            console.error('Select error:', error.message);
        } else {
            console.log('Connection successful! master_schools data sample:', data);
        }
    } catch (e) {
        console.error('Unexpected error:', e.message);
    }
}

main();
