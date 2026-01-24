const { createClient } = require('@supabase/supabase-js');
function getEnv(key) { if (process.env[key]) return process.env[key]; for (const k of Object.keys(process.env)) { if (k.includes(key)) return process.env[k]; } return null; }
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
async function c() {
    const { data } = await supabase.from('students').select('*').gte('enrollment_date', '2021-01-01').lte('enrollment_date', '2021-12-31');
    const missing = data.filter(s => !s.class_name);
    console.log(`TOTAL 2021 ENROLLED: ${data.length}`);
    console.log(`MISSING CLASS: ${missing.length}`);
}
c();
