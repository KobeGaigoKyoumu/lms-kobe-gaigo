const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data, error } = await supabase
            .from('admin_members')
            .select('name, password');

        if (error) throw error;

        console.log('--- ADMIN MEMBERS ---');
        data.forEach(m => {
            console.log(`Name: ${m.name}, Password: ${m.password}`);
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
