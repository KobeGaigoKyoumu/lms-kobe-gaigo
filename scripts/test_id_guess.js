const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Note: Standard Supabase client doesn't support raw SQL unless you have a function or use the API in a specific way.
    // But we can try to guess by looking at the error when we try to insert a record with 'id'.

    console.log("Testing upsert with 'id'...");
    const testStudent = {
        student_id_text: "TEST9999",
        status: "inactive",
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
        address: "Test Address",
        name_kana: "テスト"
    };

    const { error } = await supabase.from('students').upsert(testStudent, { onConflict: 'student_id_text' });
    if (error) {
        require('fs').writeFileSync('scripts/error_log.json', JSON.stringify(error, null, 2));
        console.log("Error written to scripts/error_log.json");
    } else {
        console.log("Upsert with ID succeeded!");
    }
}
check();
