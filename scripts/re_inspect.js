const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
    // 1. All classes
    const { data: classes } = await supabase.from('classes').select('name');
    console.log('--- All Classes ---');
    console.log(classes.map(c => c.name).sort());

    // 2. Sample student to see ID format and field names
    const { data: students } = await supabase.from('students').select('*').limit(1);
    console.log('--- Sample Student ---');
    console.log(students[0]);
}

run();
