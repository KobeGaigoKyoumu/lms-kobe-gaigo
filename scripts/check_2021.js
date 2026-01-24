const { createClient } = require('@supabase/supabase-js');

function getEnv(key) {
    if (process.env[key]) return process.env[key];
    for (const k of Object.keys(process.env)) {
        if (k.includes(key)) return process.env[k];
    }
    return null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) { console.error('Missing credentials'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check2021() {
    // Check for enrollment_date in 2021 (Jan 1 to Dec 31)
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .gte('enrollment_date', '2021-01-01')
        .lte('enrollment_date', '2021-12-31');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`count: ${students.length}`);

    // Status breakdown
    const statusCounts = {};
    const missingClass = [];
    students.forEach(s => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
        if (!s.class_name) missingClass.push(s.student_id_text);
    });

    console.log('Status breakdown:', statusCounts);
    console.log(`Students missing class info: ${missingClass.length}`);
    if (missingClass.length > 0) {
        console.log('Sample missing class IDs:', missingClass.slice(0, 5));
    }

    // Also check for students who might have ID starting with '21' (often implies 2021 enrollment) but missing date?
    // 2021 students often have IDs starting with 21 or 20 (if 2 year course? depends on school logic)
    // Actually, earlier prompt said 2021 only had 45 students.
}

check2021();
