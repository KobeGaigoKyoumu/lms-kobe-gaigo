const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Attempting to list columns and constraints via a query to information_schema if allowed
    // Note: This might not work via standard JS client RPC if not exposed.
    // Fallback: try to insert a single record with only the ID and status

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
        passport_number: "PASS123",
        residence_card_number: "RESI123",
        phone: "000-0000",
        course: "2年",
        email: "test@example.com"
    };

    console.log("Testing minimal upsert...");
    const { error: error1 } = await supabase.from('students').upsert(testStudent, { onConflict: 'student_id_text' });
    if (error1) {
        console.error("Minimal upsert failed:", error1);
    } else {
        console.log("Minimal upsert succeeded.");
        // Try to add dates one by one
        const testStudent2 = {
            student_id_text: "TEST9999",
            birth_date: "1990-01-01"
        };
        const { error: error2 } = await supabase.from('students').upsert(testStudent2, { onConflict: 'student_id_text' });
        if (error2) console.error("Date upsert failed:", error2);
        else console.log("Date upsert succeeded.");
    }
}
check();
