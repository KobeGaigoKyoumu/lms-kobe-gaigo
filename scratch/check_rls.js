
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: policies, error } = await supabase.rpc('get_policies', { table_name: 'homework_assignments' });
    console.log('Policies:', policies || error);
    
    // Check if we can fetch assignments without RLS (Service Role) vs with Anon (Simulated)
    const { data: srData } = await supabase.from('homework_assignments').select('id').limit(1);
    console.log('Service Role can see:', srData?.length || 0);
    
    const anonSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonError } = await anonSupabase.from('homework_assignments').select('id').limit(1);
    console.log('Anon can see:', anonData?.length || 0, anonError?.message);
}

check();
