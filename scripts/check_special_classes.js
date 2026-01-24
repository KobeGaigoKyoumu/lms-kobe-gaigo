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

async function checkClasses() {
    // Fetch all unique class names
    const { data, error } = await supabase
        .from('students')
        .select('class_name')
        .not('class_name', 'is', null);

    if (error) {
        console.error(error);
        return;
    }

    const uniqueClasses = new Set(data.map(s => s.class_name));
    let output = '';
    const log = (msg) => { console.log(msg); output += msg + '\n'; };

    log(`Total unique classes: ${uniqueClasses.size}`);

    const targets = ['A2', 'B1', 'C4', 'A1', 'B2', 'C1', 'C2', 'C3'];

    log('--- Verification Results ---');
    targets.forEach(t => {
        if (uniqueClasses.has(t)) {
            log(`[FOUND] ${t}`);
        } else {
            log(`[MISSING] ${t}`);
        }
    });

    const similar = [...uniqueClasses].filter(c => /^[A-C][1-9]$/.test(c));
    log('All Short Class Names: ' + similar.sort().join(', '));

    const fs = require('fs');
    fs.writeFileSync('class_verification.txt', output);

    // Also print general samples
    console.log('Sample classes:', [...uniqueClasses].slice(0, 10));
}

checkClasses();
