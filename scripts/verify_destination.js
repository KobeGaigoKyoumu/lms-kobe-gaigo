const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('students').select('student_id_text, full_name, destination').not('destination', 'is', null).limit(10);
    if (error) console.error(error);
    else {
        console.log(`Found ${data.length} students with destinations (sample):`);
        console.table(data);
    }
}
check();
