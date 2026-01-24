const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('students').select('status');
    if (error) console.error(error);
    else {
        const statuses = [...new Set(data.map(d => d.status))];
        console.log('Current Unique Statuses:', statuses);
    }
}
check();
