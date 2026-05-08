require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAnnouncements() {
    console.log('Fetching all announcements from DB...');
    const { data, error } = await adminSupabase
        .from('announcements')
        .select('id, title, target_type, target_class, target_grade, target_student_ids');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} announcements:`);
    data.forEach(a => {
        console.log(`- [${a.title}] Type: ${a.target_type}, Class: "${a.target_class}", Grade: ${a.target_grade}`);
    });
}

checkAnnouncements();
