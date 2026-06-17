const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
    try {
        const { data: schools, error } = await supabase
            .from('master_schools')
            .select('departments')
            .eq('school_type', 'vocational_school');
        
        if (error) throw error;
        
        const counts = {};
        for (const s of schools) {
            if (s.departments && s.departments.startsWith('【学習分野】')) {
                const field = s.departments.replace('【学習分野】', '');
                counts[field] = (counts[field] || 0) + 1;
            }
        }
        
        console.log(`Total unique fields: ${Object.keys(counts).length}`);
        console.log(JSON.stringify(counts, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
