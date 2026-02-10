const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try dotenv
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    // If not in env, exit
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Starting Force Fix for Academic Years...');

    let page = 0;
    const pageSize = 1000;
    let totalUpdated = 0;

    while (true) {
        const { data: students, error } = await supabase
            .from('students')
            .select('student_id_text, academic_year')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching students:', error);
            break;
        }

        if (!students || students.length === 0) break;

        console.log(`Processing page ${page}, found ${students.length} students...`);

        const updates = [];
        for (const s of students) {
            if (!s.student_id_text || s.student_id_text.length < 2) continue;

            // Check if ID starts with digits
            const prefix = s.student_id_text.substring(0, 2);
            if (!/^\d+$/.test(prefix)) continue;

            const yearShort = parseInt(prefix, 10);
            const correctYear = 2000 + yearShort;

            if (s.academic_year !== correctYear) {
                updates.push({
                    student_id_text: s.student_id_text,
                    academic_year: correctYear,
                    old_year: s.academic_year
                });
            }
        }

        if (updates.length > 0) {
            console.log(`Found ${updates.length} discrepancies in this batch.`);

            // Update individually to ensure success
            for (const u of updates) {
                const { error: updateError } = await supabase
                    .from('students')
                    .update({ academic_year: u.academic_year })
                    .eq('student_id_text', u.student_id_text);

                if (updateError) {
                    console.error(`Failed to update ${u.student_id_text}:`, updateError.message);
                } else {
                    console.log(`Updated ${u.student_id_text}: ${u.old_year} -> ${u.academic_year}`);
                    totalUpdated++;
                }
            }
        }

        if (students.length < pageSize) break;
        page++;
    }

    console.log(`Finished. Total Updated: ${totalUpdated}`);
}

run();
