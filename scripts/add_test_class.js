const { createClient } = require('@supabase/supabase-js');

async function checkAndAddClass() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check existing classes
    const { data: classes, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

    if (fetchError) {
        console.error('Error fetching classes:', fetchError);
        return;
    }

    console.log('Current classes:', classes.map(c => c.name).join(', '));

    const testClassName = 'テストユーザー';
    const exists = classes.some(c => c.name === testClassName);

    if (exists) {
        console.log(`Class "${testClassName}" already exists.`);
    } else {
        console.log(`Adding class "${testClassName}"...`);
        const { error: insertError } = await supabase
            .from('classes')
            .insert({ name: testClassName });

        if (insertError) {
            console.error('Error adding class:', insertError);
        } else {
            console.log(`Successfully added class "${testClassName}".`);
        }
    }
}

checkAndAddClass();
