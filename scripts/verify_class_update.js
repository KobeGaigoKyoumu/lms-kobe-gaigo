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

async function verify() {
    // Fetch a student known to have class (e.g., from mapping)
    // Random ID from JSON if I could read it, but let's just pick one or search where class_name is not null
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .not('class_name', 'is', null) // Check not null
        .limit(5);

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

verify();
