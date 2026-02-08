const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
    const { data: classes } = await supabase.from('classes').select('*');
    console.log('--- Classes Found ---');
    classes.forEach(c => {
        if (c.name.includes('テスト')) {
            console.log(`- ${c.name} (id: ${c.id})`);
        }
    });

    const { data: students } = await supabase.from('students').select('*').limit(1);
    console.log('--- Student Table Columns ---');
    if (students && students[0]) {
        console.log(Object.keys(students[0]));
    } else {
        console.log('No students found to check columns.');
    }
}

inspect();
