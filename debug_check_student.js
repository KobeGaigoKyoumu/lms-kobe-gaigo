const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Log the current directory
console.log('Current directory:', process.cwd());

// Try to find .env.local
const possiblePaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(__dirname, '.env.local'),
    '.env.local'
];

let envContent = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        console.log('Found .env.local at:', p);
        envContent = fs.readFileSync(p, 'utf8');
        break;
    }
}

if (!envContent) {
    console.error('Could not find .env.local');
    process.exit(1);
}

const env = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim();
        env[key] = val;
    }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Credentials missing in .env.local');
    console.log('Keys found:', Object.keys(env));
    process.exit(1);
}

console.log('Connecting to Supabase...');
const supabase = createClient(url, key);

async function check() {
    const ids = ['2504013', '2404114', '2304048'];
    const { data: students, error } = await supabase
        .from('students')
        .select('student_id_text, academic_year, status, class_name')
        .in('student_id_text', ids);

    if (error) {
        console.error('Error fetching students:', error);
    } else {
        console.log('Students:', JSON.stringify(students, null, 2));
    }
}

check();
