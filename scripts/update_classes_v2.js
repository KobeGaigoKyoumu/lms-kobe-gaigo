const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function getEnv(key) {
    if (process.env[key]) return process.env[key];
    for (const k of Object.keys(process.env)) {
        if (k.includes(key)) return process.env[k];
    }
    return null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function update() {
    console.log('Reading student_classes.json...');
    const data = JSON.parse(fs.readFileSync('data/student_classes.json', 'utf8'));
    const entries = Object.entries(data);
    console.log(`Found ${entries.length} records to update.`);

    // Prepare batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i / BATCH_SIZE + 1}...`);

        // We can't do a single bulk upsert easily because we only want to update class_name based on ID
        // But we can try to do parallel promises or use upsert if we had all data.
        // Efficient way: Use `upsert` if we have primary key. ID_TEXT is unique?
        // Actually, looping might be slow but safest.
        // Optimisation: create list of promises.

        await Promise.all(batch.map(async ([id, cls]) => {
            const { error } = await supabase
                .from('students')
                .update({ class_name: cls })
                .eq('student_id_text', id);

            if (error) console.error(`Error updating ${id}:`, error.message);
        }));
    }
    console.log('Update complete.');
}

update();
