const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySql() {
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260211_jlpt_optimization_views.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying SQL Views...');

    // Split SQL into individual statements because some drivers/RPCs might not handle multiple
    // or just try to run it via a custom RPC if we have one (usually called 'exec_sql' or similar)
    // If not, we might need to use the REST API to execute it if possible, 
    // BUT usually we can just use the Postgres direct client if we had it.
    // In this environment, I'll try to use a dummy query to see if the views exist first, 
    // or if I can use a known RPC.

    // Wait, the user has Supabase CLI or I can just assume they will run it in the SQL Editor?
    // Actually, I can try to run it via `supabase.rpc('exec_sql', { sql_query: sql })` if it exists.
    // If not, I'll recommend the user to run it in the SQL Editor.

    console.log('NOTE: Since direct SQL execution via RPC might be restricted, please run the contents of');
    console.log('supabase/migrations/20260211_jlpt_optimization_views.sql in your Supabase SQL Editor.');
    console.log('If you want me to try running it, I will attempt a known RPC call.');

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.warn('RPC exec_sql failed (expected if not setup). Error:', error.message);
            console.log('Moving to manual verification of views...');
        } else {
            console.log('SQL applied successfully via RPC!');
        }
    } catch (e) {
        console.error('Unexpected error applying SQL:', e.message);
    }
}

applySql();
