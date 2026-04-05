const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkData() {
    console.log('--- File System Check ---');
    const jlptDir = path.join(process.cwd(), 'data', 'JLPT結果');
    if (fs.existsSync(jlptDir)) {
        const subdirs = fs.readdirSync(jlptDir);
        console.log(`JLPT_BASE_DIR exists. Subdirectories: ${subdirs.length}`);
        subdirs.slice(0, 5).forEach(dir => {
            const files = fs.readdirSync(path.join(jlptDir, dir));
            console.log(`  - ${dir}: ${files.length} files`);
        });
    } else {
        console.log('JLPT_BASE_DIR does NOT exist: ' + jlptDir);
    }

    console.log('\n--- Supabase Check ---');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { count: studentCount, error: sErr } = await supabase.from('students').select('*', { count: 'exact', head: true });
    console.log(`Student Count: ${studentCount} (Error: ${sErr?.message || 'none'})`);

    const { count: gradeCount, error: gErr } = await supabase.from('grade_records').select('*', { count: 'exact', head: true });
    console.log(`Grade Records Count: ${gradeCount} (Error: ${gErr?.message || 'none'})`);

    if (gradeCount > 0) {
        const { data: sampleGrades } = await supabase.from('grade_records').select('year_term, student_name').limit(5);
        console.log('Sample Grade Records:', sampleGrades);
    }
}

checkData();
