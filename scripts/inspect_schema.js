const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .limit(1);

    if (studentError) {
        console.error('Students Error:', studentError);
    } else {
        console.log('Students columns:', Object.keys(students[0] || {}));
    }

    const { data: announcements, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .limit(1);

    if (announcementError) {
        console.error('Announcements Error:', announcementError);
    } else {
        console.log('Announcements columns:', Object.keys(announcements[0] || {}));
    }

    // Get distinct grades and classes
    const { data: grades } = await supabase.from('students').select('grade').not('grade', 'is', null);
    const distinctGrades = [...new Set(grades?.map(s => s.grade))].sort();
    console.log('Distinct Grades:', distinctGrades);

    const { data: classes } = await supabase.from('students').select('class_name').not('class_name', 'is', null);
    const distinctClasses = [...new Set(classes?.map(s => s.class_name))].sort();
    console.log('Distinct Classes:', distinctClasses);
}

inspectSchema();
