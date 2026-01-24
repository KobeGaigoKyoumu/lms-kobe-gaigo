const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function getEnv(key) {
    if (process.env[key]) return process.env[key];
    for (const k of Object.keys(process.env)) {
        if (k.includes(key)) return process.env[k];
    }
    return null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    // Try to insert a dummy record to get column errors, or utilize an RPC if available.
    // simpler: select one record
    const { data, error } = await supabase.from('students').select('*').limit(1);
    if (error) {
        console.error('Error selecting:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:');
            Object.keys(data[0]).sort().forEach(k => console.log(k));
        } else {
            console.log('No data found, cannot list columns easily without data.');
            // Try to insert a bad record to trigger schema error?
        }
    }
}
checkSchema();
