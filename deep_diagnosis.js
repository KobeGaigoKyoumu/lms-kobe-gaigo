const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- Schema Check: homework_assignments ---");
    // Get one row to see columns
    const { data: cols, error: err } = await supabase.from('homework_assignments').select('*').limit(1);
    if (err) console.error(err);
    if (cols && cols.length > 0) {
        console.log("Columns:", Object.keys(cols[0]));
    }

    console.log("\n--- Specific Data Check: Class '2-13' ---");
    // Check assignments for 2-13
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('class_name', '%2%13%');
    
    if (assignments) {
        assignments.forEach(a => {
            console.log(`Title: ${a.title}`);
            console.log(`Class: "${a.class_name}"`);
            console.log(`Released: ${a.released_at}`);
            console.log(`Archived: ${a.is_archived}`);
            console.log(`ID: ${a.id}`);
            console.log("---");
        });
    }

    console.log("\n--- Student Check: RONY MD MAHMUD HASAN ---");
    const { data: student } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%MAHMUD%');
    
    if (student) {
        student.forEach(s => {
            console.log(`Name: ${s.full_name}`);
            console.log(`Class: "${s.class_name}"`);
            console.log(`Year: ${s.academic_year}`);
            console.log(`ID: ${s.student_id_text}`);
        });
    }
}
run();
