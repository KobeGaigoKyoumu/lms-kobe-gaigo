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
    // Check ID 2010029
    console.log("Checking ID 2010029...");
    const { data: d1, error: e1 } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', '2010029');

    if (d1 && d1.length) console.log("ID 2010029 Found:", d1[0]);
    else console.log("ID 2010029 NOT FOUND");

    // Check Name like 'ABOOTORAB'
    console.log("Checking Name 'ABOOTORAB'...");
    const { data: d2, error: e2 } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%ABOOTORAB%');

    if (d2 && d2.length) {
        d2.forEach(s => console.log(`Found by Name: ${s.student_id_text} | ${s.full_name} | Class: ${s.class_name}`));
    } else {
        console.log("Name NOT FOUND");
    }
}

check();
