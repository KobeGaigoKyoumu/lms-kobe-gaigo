const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const STATUSES = [
    'completed', 'withdrawn', 'dropout', 'dismissed', 'expelled',
    'graduated_completed', 'withdrawn_dropout', 'finished', 'quit'
];

async function check() {
    for (const status of STATUSES) {
        const testStudent = {
            student_id_text: "TEST_STAT_" + status.toUpperCase(),
            status: status,
            full_name: "TEST STUDENT",
            academic_year: 2024,
            nationality: "Test",
            gender: "M",
            birth_date: "2000-01-01",
            enrollment_date: "2024-04-01",
            enrollment_period: "2024/04",
            class_name: "TestClass",
            entry_date: "2024-04-01",
            visa_status: "TestVisa",
            visa_expiry: "2025-04-01",
            name_romaji: "TEST ROMAJI",
            name_kana: "テスト カナ",
            address: "Test Address"
        };

        const { error } = await supabase.from('students').upsert(testStudent, { onConflict: 'student_id_text' });
        if (error) {
            console.log(`Status [${status}] failed: ${error.message}`);
        } else {
            console.log(`Status [${status}] SUCCEEDED!`);
        }
    }
}
check();
