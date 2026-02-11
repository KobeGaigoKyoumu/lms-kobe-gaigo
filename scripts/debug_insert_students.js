const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function debugInsert() {
    const { data: classes } = await supabase.from('classes').select('name');
    console.log('Class "テスト" exists:', classes.some(c => c.name === 'テスト'));

    const res = await supabase.from('students').insert({
        student_id_text: 'TEST_USER_01',
        full_name: '田中裕二',
        class_name: 'テスト',
        status: '在学'
    });

    if (res.error) {
        console.log('Error adding 田中裕二:', JSON.stringify(res.error, null, 2));
    } else {
        console.log('Successfully added 田中裕二');
    }

    const res2 = await supabase.from('students').insert({
        student_id_text: 'TEST_USER_02',
        full_name: '中井彩乃',
        class_name: 'テスト',
        status: '在学'
    });

    if (res2.error) {
        console.log('Error adding 中井彩乃:', JSON.stringify(res2.error, null, 2));
    } else {
        console.log('Successfully added 中井彩乃');
    }
}

debugInsert();
