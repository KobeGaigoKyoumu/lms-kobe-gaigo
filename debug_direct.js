const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
console.log('Reading .env.local from:', envPath);

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            env[key] = val;
        }
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('URL:', url);
    console.log('Key (first 10):', key ? key.substring(0, 10) : 'MISSING');

    if (!url || !key) {
        throw new Error('Credentials missing');
    }

    const supabase = createClient(url, key);

    // Check 2504094
    supabase.from('students')
        .select('student_id_text, academic_year, status, full_name')
        .eq('student_id_text', '2504094')
        .single()
        .then(({ data, error }) => {
            if (error) console.error('Error:', error);
            else console.log('Student:', data);
        });

} catch (err) {
    console.error('Script failed:', err);
}
