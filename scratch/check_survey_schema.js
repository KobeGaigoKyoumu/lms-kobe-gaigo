const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Querying student_exam_surveys...');
    try {
        const { data, error, count } = await supabase
            .from('student_exam_surveys')
            .select('*', { count: 'exact' });

        if (error) {
            console.error('Error fetching surveys:', error.message);
        } else {
            console.log('Total records count:', count);
            console.log('Sample data (first 3):', JSON.stringify(data.slice(0, 3), null, 2));
        }
    } catch (e) {
        console.error('Unexpected error:', e.message);
    }
}

run();
