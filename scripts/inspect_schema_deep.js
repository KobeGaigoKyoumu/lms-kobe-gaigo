const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Some Supabase setups allow querying information_schema via a hidden endpoint or if enabled in API
    // If not, we can try to guess by looking at the REST API definition if available

    console.log("Fetching table definition via RPC if exists...");
    try {
        const { data, error } = await supabase.rpc('get_table_definition', { table_name: 'students' });
        if (data) console.log(data);
        else console.log("RPC not found or failed:", error);
    } catch (e) {
        console.log("RPC failed.");
    }

    const { data: rows, error: rowError } = await supabase.from('students').select('*').limit(1);
    if (rowError) console.error(rowError);
    if (rows && rows.length > 0) {
        const keys = Object.keys(rows[0]);
        console.log(`Found ${keys.length} keys.`);
        require('fs').writeFileSync('scripts/student_keys.json', JSON.stringify(keys, null, 2));
    } else {
        console.log("No rows found to inspect.");
    }
}
check();
