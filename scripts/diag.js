const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env.local manually
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key to see what the dashboard sees
);

async function check() {
    console.log('--- Database Inspection ---');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Announcements Fetch Error:', error);
    } else {
        console.log('Announcements Sample Data Keys:', Object.keys(data[0] || {}));
        console.log('Full Sample Data:', data[0]);
    }

    // Check with service role too
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data: sData, error: sError } = await serviceSupabase
            .from('announcements')
            .select('*')
            .limit(1);
        if (sError) {
            console.error('Service Role Fetch Error:', sError);
        } else {
            console.log('Service Role Sample Data Keys:', Object.keys(sData[0] || {}));
        }
    }
}
check();
