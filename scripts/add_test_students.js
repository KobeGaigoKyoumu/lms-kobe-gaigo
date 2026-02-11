const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
    // 1. Manage Classes
    const { data: classes } = await supabase.from('classes').select('*');
    const testClass = classes.find(c => c.name === 'テスト');
    const testUserClass = classes.find(c => c.name === 'テストユーザー');

    if (!testClass) {
        if (testUserClass) {
            console.log('Renaming "テストユーザー" to "テスト"...');
            await supabase.from('classes').update({ name: 'テスト' }).eq('id', testUserClass.id);
        } else {
            console.log('Creating "テスト" class...');
            await supabase.from('classes').insert({ name: 'テスト' });
        }
    } else {
        console.log('"テスト" class already exists.');
        if (testUserClass) {
            console.log('Deleting redundant "テストユーザー" class...');
            await supabase.from('classes').delete().eq('id', testUserClass.id);
        }
    }

    // 2. Add Students
    const testStudents = [
        { name: '田中裕二', id: 'TEST001' },
        { name: '中井彩乃', id: 'TEST002' }
    ];

    for (const s of testStudents) {
        const { data: existing } = await supabase
            .from('students')
            .select('*')
            .eq('full_name', s.name)
            .eq('class_name', 'テスト')
            .single();

        if (existing) {
            console.log(`Student "${s.name}" already exists in "テスト" class.`);
            continue;
        }

        console.log(`Adding student "${s.name}" to "テスト" class...`);
        const { error } = await supabase.from('students').insert({
            student_id_text: s.id,
            full_name: s.name,
            class_name: 'テスト',
            status: '在学' // Usual status
        });

        if (error) {
            console.error(`Error adding ${s.name}:`, error.message);
        } else {
            console.log(`Successfully added ${s.name}.`);
        }
    }
}

run();
