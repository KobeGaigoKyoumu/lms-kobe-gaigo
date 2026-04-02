const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']; // Using anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const now = new Date().toISOString();
    console.log("Testing .or with quotes...");
    const res1 = await supabase.from('homework_assignments').select('id').or(`released_at.is.null,released_at.lte."${now}"`).limit(1);
    console.log("With quotes error:", res1.error);

    console.log("Testing .or without quotes...");
    const res2 = await supabase.from('homework_assignments').select('id').or(`released_at.is.null,released_at.lte.${now}`).limit(1);
    console.log("Without quotes error:", res2.error);
}
run();
