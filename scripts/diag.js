const { createClient } = require('@supabase/supabase-js');
// Load env manually if needed, but let's assume they are provided via command line or env
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('Checking announcements table...');
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { t_name: 'announcements' });
    if (colError) {
        // Fallback: try to select one row
        const { data, error } = await supabase.from('announcements').select('*').limit(1);
        if (error) {
            console.error('Error fetching announcements:', error);
        } else {
            console.log('Announcements columns:', Object.keys(data[0] || {}));
        }
    } else {
        console.log('Columns:', cols);
    }
}
check();
