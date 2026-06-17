const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('Missing Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('Fetching grade_records for JLPT...');
    const { data: records, error } = await supabase
        .from('grade_records')
        .select('*')
        .limit(10);

    if (error) {
        console.error('Error fetching records:', error.message);
        return;
    }

    console.log('Total records fetched:', records.length);
    records.forEach((r, idx) => {
        console.log(`--- Record ${idx + 1} ---`);
        console.log('student_id_text:', r.student_id_text);
        console.log('year_term:', r.year_term);
        console.log('final_exam_data:', JSON.stringify(r.final_exam_data, null, 2));
    });

    console.log('\nFetching records with like year_term "JLPT%"...');
    const { data: jlptRecords, error: jlptErr } = await supabase
        .from('grade_records')
        .select('*')
        .like('year_term', 'JLPT%')
        .limit(10);

    if (jlptErr) {
        console.error('Error fetching JLPT records:', jlptErr.message);
        return;
    }

    console.log('Total JLPT records fetched:', jlptRecords.length);
    jlptRecords.forEach((r, idx) => {
        console.log(`--- JLPT Record ${idx + 1} ---`);
        console.log('student_id_text:', r.student_id_text);
        console.log('year_term:', r.year_term);
        console.log('final_exam_data:', JSON.stringify(r.final_exam_data, null, 2));
    });
}

main();
