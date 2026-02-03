
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkMessages() {
    console.log('Fetching messages...');
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*');

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    console.log(`Found ${messages.length} messages:`);
    console.log(JSON.stringify(messages, null, 2));

    console.log('\nFetching students for these messages...');
    const studentIds = [...new Set(messages.map(m => m.student_id))];
    console.log('Student IDs:', studentIds);

    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('student_id_text, name')
        .in('student_id_text', studentIds);

    if (studentError) {
        console.error('Error fetching students:', studentError);
        return;
    }

    console.log('Found students:', students);
}

checkMessages();
