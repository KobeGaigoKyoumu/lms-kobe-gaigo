const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const sqlPath = path.join(__dirname, '../supabase/migrations/20260604_create_master_schools.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Attempting to apply SQL via exec_sql RPC...');
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('Failed to run migration via RPC. Error:', error.message);
            console.log('\n--- PLEASE RUN THIS SQL IN THE SUPABASE SQL EDITOR manually: ---\n');
            console.log(sql);
            console.log('\n--------------------------------------------------------------\n');
        } else {
            console.log('SQL applied successfully via RPC! Data:', data);
        }
    } catch (e) {
        console.error('Unexpected error applying SQL:', e.message);
    }
}

run();
