const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://mwtlfyhkzkfagvmdwgii.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE');

async function run() {
    console.log('--- Phase 1: Heavy Numeric Matching Cleansing ---');
    
    // 1. Get Master Mapping (Numeric ID -> Suffix)
    const { data: students, error: stdError } = await s.from('students').select('student_id_text, class_name');
    if (stdError) throw stdError;
    
    const numericIdMap = new Map();
    students.forEach(st => {
        const numId = String(st.student_id_text || '').replace(/\D/g, '');
        if (numId && st.class_name && st.class_name.includes('-')) {
            numericIdMap.set(numId, st.class_name.split('-')[1]);
        }
    });
    console.log('Master Map size: ' + numericIdMap.size);

    // 2. Locate records up to March 2025
    const { data: records, error: recError } = await s.from('attendance_records')
        .select('id, student_id, year, month')
        .lte('year', 2025);
    
    if (recError) throw recError;

    let updatedCount = 0;
    console.log('Total potential records: ' + records.length);

    // BATCH UPDATE (Parallel chunks of 50)
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (r) => {
            if (r.year === 2025 && r.month >= 4) return;

            const numId = String(r.student_id || '').replace(/\D/g, '');
            const suffix = numericIdMap.get(numId);

            if (suffix) {
                const { error } = await s.from('attendance_records').update({ class_code: suffix }).eq('id', r.id);
                if (!error) updatedCount++;
            }
        }));
        if (i % 500 === 0) console.log(`Processed ${i} / ${records.length}...`);
    }

    console.log('ULTIMATE SUCCESS: Updated ' + updatedCount + ' records based on numeric ID matching.');
}

run().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
