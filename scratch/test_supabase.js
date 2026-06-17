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
    console.log('Fetching a single student...');
    const { data: before, error: getErr } = await supabase
        .from('students')
        .select('*')
        .limit(1)
        .single();

    if (getErr) {
        console.error('Error fetching student:', getErr.message);
        return;
    }

    console.log('Student before update:', {
        student_id_text: before.student_id_text,
        full_name: before.full_name,
        class_name: before.class_name,
        destination: before.destination
    });

    const testId = before.student_id_text;
    const originalDest = before.destination;
    const testDest = `Test Destination ${Date.now()}`;

    console.log(`Updating student ${testId} with destination: ${testDest}`);
    const { error: updateErr } = await supabase
        .from('students')
        .update({
            destination: testDest
        })
        .eq('student_id_text', testId);

    if (updateErr) {
        console.error('Update error:', updateErr.message);
        return;
    }

    const { data: after, error: getErr2 } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', testId)
        .single();

    if (getErr2) {
        console.error('Error fetching student after:', getErr2.message);
        return;
    }

    console.log('Student after update:', {
        student_id_text: after.student_id_text,
        full_name: after.full_name,
        class_name: after.class_name,
        destination: after.destination
    });

    // Restore original destination
    console.log('Restoring original destination...');
    await supabase
        .from('students')
        .update({
            destination: originalDest
        })
        .eq('student_id_text', testId);
}

main();

