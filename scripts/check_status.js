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

// Using service role key to see "truth"
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log("Checking ID 2010029 details...");
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', '2010029');

    if (error) console.error(error);
    else console.log(data);
}

check();
