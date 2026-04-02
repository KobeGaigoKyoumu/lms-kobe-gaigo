const fs = require('fs');
const path = require('path');

// Basic .env.local parser
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(line => line.includes('=')).forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) {
        const key = line.substring(0, eq).trim();
        const val = line.substring(eq + 1).trim();
        env[key] = val;
    }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDuplicates() {
    try {
        const { data: classes, error: clsError } = await supabase.from('classes').select('*');
        if (clsError) throw clsError;

        const { data: schedules, error: schError } = await supabase.from('schedules').select('class_id');
        if (schError) {
            console.warn('Schedules fetch error (maybe RLS?):', schError.message);
        }

        const scheduleCountByClass = {};
        (schedules || []).forEach(s => {
            scheduleCountByClass[s.class_id] = (scheduleCountByClass[s.class_id] || 0) + 1;
        });

        const classGroups = {};
        classes.forEach(c => {
            if (!classGroups[c.name]) classGroups[c.name] = [];
            classGroups[c.name].push({
                ...c,
                schedulesCount: scheduleCountByClass[c.id] || 0
            });
        });

        const report = [];
        Object.entries(classGroups).forEach(([name, items]) => {
            if (items.length > 1) {
                report.push({
                    name,
                    duplicates: items.map(i => ({
                        id: i.id,
                        teacher_id: i.teacher_id,
                        homeroom_teacher_name: i.homeroom_teacher_name,
                        schedulesCount: i.schedulesCount
                    }))
                });
            }
        });

        console.log('---REPORTOUTPUT---');
        console.log(JSON.stringify(report, null, 2));
        console.log('---ENDREPORTOUTPUT---');
    } catch (e) {
        console.error('Error:', e);
    }
}

checkDuplicates();
