const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Environment variables MATCHING import_master_data.js exact setup
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Log keys length to verify they are loaded
console.log(`URL: ${supabaseUrl}`);
console.log(`Key length: ${supabaseServiceKey ? supabaseServiceKey.length : 0}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAcademicYears() {
    console.log('Fetching all students...');

    const { data: students, error } = await supabase
        .from('students')
        .select('student_id_text, academic_year, status')
        .range(0, 2000); // Fetch up to 2000

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    console.log(`Found ${students.length} students.`);

    const updates = [];
    let correctCount = 0;

    for (const student of students) {
        if (!student.student_id_text || student.student_id_text.length < 2) continue;
        // Skip non-numeric IDs if any
        if (isNaN(parseInt(student.student_id_text.substring(0, 1)))) continue;

        const yearShort = parseInt(student.student_id_text.substring(0, 2), 10);
        const correctYear = 2000 + yearShort;

        if (student.academic_year !== correctYear) {
            // console.log(`Mismatch: ${student.student_id_text}: DB=${student.academic_year}, Calc=${correctYear}`);
            updates.push({
                student_id_text: student.student_id_text,
                academic_year: correctYear
            });
        } else {
            correctCount++;
        }
    }

    console.log(`${correctCount} students correct.`);
    console.log(`${updates.length} students need update.`);

    if (updates.length > 0) {
        console.log('Sample mismatch:', updates[0]);
        console.log('Updating...');

        let successCount = 0;
        let failCount = 0;

        // Update in batches? No, individual updates are safer for error checking now.
        // Parallel limits
        const bucketSize = 20;
        for (let i = 0; i < updates.length; i += bucketSize) {
            const chunk = updates.slice(i, i + bucketSize);
            await Promise.all(chunk.map(async (u) => {
                const { error: err } = await supabase
                    .from('students')
                    .update({ academic_year: u.academic_year })
                    .eq('student_id_text', u.student_id_text);

                if (err) {
                    console.error(`Failed ${u.student_id_text}: ${err.message}`);
                    failCount++;
                } else {
                    successCount++;
                }
            }));
            process.stdout.write('.');
        }
        console.log(`\nDone. Success: ${successCount}, Fail: ${failCount}`);
    } else {
        console.log('No updates needed.');
    }
}

fixAcademicYears();
