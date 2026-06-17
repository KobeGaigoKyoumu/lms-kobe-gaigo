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

async function searchSchools(keyword) {
    const { data, error } = await supabase
        .from('master_schools')
        .select('name, code, school_type')
        .eq('school_type', 'vocational_school')
        .ilike('name', `%${keyword}%`);
        
    if (error) {
        console.error(`Error searching ${keyword}:`, error);
    } else {
        console.log(`Results for "${keyword}":`, data.map(d => d.name));
    }
}

async function run() {
    await searchSchools('東北外語');
    await searchSchools('吉田学園');
    await searchSchools('日本福祉');
    await searchSchools('仙台保健福祉');
    await searchSchools('今泉');
}

run();
