const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching sample vocational schools...");
    const { data, error } = await supabase
        .from('master_schools')
        .select('*')
        .eq('school_type', 'vocational_school')
        .limit(10);
        
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Sample records:", JSON.stringify(data, null, 2));
    }
}

run();
