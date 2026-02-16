
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from .env.check for debug purposes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mwtlfyhkzkfagvmdwgii.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE";

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStudentStatus(studentIdText, className) {
    console.log(`Debugging for Student: ${studentIdText}, Class: ${className}`);

    // 1. Get Assignments for Class
    const { data: assignments, error: assignError } = await supabase
        .from('homework_assignments')
        .select('id, title, class_name')
        .eq('class_name', className);

    if (assignError) {
        console.error('Error fetching assignments:', assignError);
        return;
    }

    console.log(`Found ${assignments.length} assignments for class ${className}`);

    if (assignments.length === 0) return;

    const assignmentIds = assignments.map(a => a.id);

    // 2. Get Submissions for Student
    const { data: submissions, error: subError } = await supabase
        .from('homework_submissions')
        .select('assignment_id, status, student_id_text')
        .eq('student_id_text', studentIdText)
        .in('assignment_id', assignmentIds);

    if (subError) {
        console.error('Error fetching submissions:', subError);
        return;
    }

    console.log(`Found ${submissions.length} submissions for student ${studentIdText}`);

    // 3. Analyze Status
    const submissionMap = new Map();
    submissions.forEach(s => submissionMap.set(s.assignment_id, s.status));

    let unsubmittedCount = 0;
    assignments.forEach(a => {
        const status = submissionMap.get(a.id);
        const isUnsubmitted = !status || status === 'returned';
        if (isUnsubmitted) unsubmittedCount++;
        console.log(`- Assignment: ${a.title} (${a.id}) -> Status: ${status || 'NOT SUBMITTED'} [${isUnsubmitted ? 'COUNTED' : 'DONE'}]`);
    });
    console.log(`Total Unsubmitted Count: ${unsubmittedCount}`);
}

// Run with hardcoded ID from screenshot and class guess
// I'll also try to find the student to get the correct class
async function run() {
    console.log('Finding student 1234...');
    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', '1234')
        .single();

    if (student) {
        console.log('Student found:', student.full_name, student.class_name);
        await debugStudentStatus('1234', student.class_name);
    } else {
        console.log('Student 1234 not found in students table. Trying to find any student to test...');
    }
}

run();
