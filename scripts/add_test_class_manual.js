const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    // Manually load env from .vercel/.env.development.local
    const envPath = path.join(__dirname, '..', '.vercel', '.env.development.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1]] = match[2].trim().replace(/^"(.*)"$/, '$1');
        }
    });

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing key in .env file');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const testClassName = 'テストユーザー';
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
            console.error('Error:', error);
        } else {
            console.log('Success!');
        }
    }
}

run();
