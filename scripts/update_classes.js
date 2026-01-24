const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to find key ignoring BOM or whitespace
function getEnv(key) {
    if (process.env[key]) return process.env[key];
    // Check for BOM prefixed key
    for (const k of Object.keys(process.env)) {
        if (k.includes(key)) {
            return process.env[k];
        }
    }
    return null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Make sure to run with --env-file=.env.local');

    console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
    console.error('Key:', supabaseServiceKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateClasses() {
    const jsonPath = path.resolve(__dirname, '../data/student_classes.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('student_classes.json not found');
        process.exit(1);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const classMapping = JSON.parse(rawData);

    console.log(`Loaded mapping for ${Object.keys(classMapping).length} students.`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process in batches
    const studentIds = Object.keys(classMapping);
    const BATCH_SIZE = 50;

    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batchIds = studentIds.slice(i, i + BATCH_SIZE);
        const updates = batchIds.map(id => ({
            student_id: id,
            class_name: classMapping[id]
        }));

        // We can't do a bulk update with different values easily in one query unless we use upsert
        // upsert requires all non-nullable fields if it's an insert, but here we are updating.
        // However, upsert works if PK exists. 
        // CAUTION: upsert might overwrite other fields if we are not careful.
        // But here we only provide student_id and class_name. 
        // If the record exists, it updates. If not, it inserts (which might fail if other fields are required).
        // Since we are targeting *existing* students (imported in previous step), 
        // we want to ensure we don't accidentally create new partial records if ID doesn't exist.
        // So safe way is individual updates or using a custom RPC, but individual is fine for 1500 records.
        // To speed up, we can use Promise.all for the batch.

        const promises = batchIds.map(id => {
            return supabase
                .from('students')
                .update({ class_name: classMapping[id] })
                .eq('student_id_text', id);
        });

        const results = await Promise.all(promises);

        results.forEach(res => {
            if (res.error) {
                console.error(`Error updating: ${JSON.stringify(res.error)}`);
                fs.writeFileSync('error_log.txt', JSON.stringify(res.error, null, 2));
                process.exit(1); // Stop on first error to debug
                errorCount++;
            } else {
                updatedCount++;
            }
        });

        console.log(`Processed ${Math.min(i + BATCH_SIZE, studentIds.length)}/${studentIds.length}`);
    }

    console.log(`Update complete. Success: ${updatedCount}, Errors: ${errorCount}`);
}

updateClasses();
