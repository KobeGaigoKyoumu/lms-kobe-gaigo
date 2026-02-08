const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function addTestClass() {
    const testClassName = 'テストユーザー';

    // Check if exists
    const { data: existing } = await supabase
        .from('classes')
        .select('*')
        .eq('name', testClassName)
        .single();

    if (existing) {
        console.log(`Class "${testClassName}" already exists.`);
    } else {
        console.log(`Adding class "${testClassName}"...`);
        const { error } = await supabase
            .from('classes')
            .insert({ name: testClassName });

        if (error) {
            console.error('Error:', error.message);
        } else {
            console.log('Successfully added!');
        }
    }
}

addTestClass();
