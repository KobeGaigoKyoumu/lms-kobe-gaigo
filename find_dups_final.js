const fs = require('fs');
const path = require('path');

// Read .env.local manually to be safe
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function findDuplicates() {
    try {
        console.log('Fetching classes...');
        const { data: classes, error: clsError } = await supabase.from('classes').select('*');
        if (clsError) throw clsError;

        console.log('Fetching schedules...');
        const { data: schedules, error: schError } = await supabase.from('schedules').select('class_id');
        // Ignore schedule error if it's just RLS, but try to continue
        
        const scheduleCountMap = {};
        (schedules || []).forEach(s => {
            scheduleCountMap[s.class_id] = (scheduleCountMap[s.class_id] || 0) + 1;
        });

        const nameGroups = {};
        classes.forEach(c => {
            if (!nameGroups[c.name]) nameGroups[c.name] = [];
            nameGroups[c.name].push({
                ...c,
                scCount: scheduleCountMap[c.id] || 0
            });
        });

        const results = [];
        Object.entries(nameGroups).forEach(([name, items]) => {
            if (items.length > 1) {
                results.push({
                    name,
                    items: items.map(i => ({
                        id: i.id,
                        teacher_id: i.teacher_id,
                        hn: i.homeroom_teacher_name,
                        sc: i.scCount
                    }))
                });
            }
        });

        console.log('---RESULT_START---');
        console.log(JSON.stringify(results, null, 2));
        console.log('---RESULT_END---');
    } catch (e) {
        console.error('Script Error:', e.message);
    }
}

findDuplicates();
