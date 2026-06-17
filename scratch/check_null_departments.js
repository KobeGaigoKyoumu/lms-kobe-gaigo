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
    // departments が null の専門学校数
    const { count: nullCount } = await supabase
        .from('master_schools')
        .select('*', { count: 'exact', head: true })
        .eq('school_type', 'vocational_school')
        .is('departments', null);
    
    const { count: totalCount } = await supabase
        .from('master_schools')
        .select('*', { count: 'exact', head: true })
        .eq('school_type', 'vocational_school');
    
    console.log(`Total vocational schools: ${totalCount}`);
    console.log(`With departments: ${totalCount - nullCount}`);
    console.log(`Without departments (null): ${nullCount}`);
    
    // null の学校名をサンプリング
    const { data: samples } = await supabase
        .from('master_schools')
        .select('name')
        .eq('school_type', 'vocational_school')
        .is('departments', null)
        .limit(50);
    
    console.log('\nSample school names without departments:');
    samples.forEach(s => console.log(`  - ${s.name}`));
}

run();
