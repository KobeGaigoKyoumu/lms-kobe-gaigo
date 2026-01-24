const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function getEnv(key) {
    if (process.env[key]) return process.env[key];
    for (const k of Object.keys(process.env)) {
        if (k.includes(key)) return process.env[k];
    }
    return null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const id = '2010025';
    console.log(`Checking DB for ${id}...`);
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', id);

    let out = '';
    const log = (msg) => { console.log(msg); out += (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n'; };

    if (error) console.error(error);
    else {
        if (data.length === 0) log('Student NOT FOUND in DB');
        else log(data[0]);
    }

    fs.writeFileSync('check_verify.txt', out);
}

check();
