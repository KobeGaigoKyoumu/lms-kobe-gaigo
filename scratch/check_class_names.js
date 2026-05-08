
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: assignments } = await supabase.from('homework_assignments').select('class_name').limit(10);
    console.log('Assignments Class Names:', assignments.map(a => a.class_name));
    
    const { data: classes } = await supabase.from('classes').select('name').limit(10);
    console.log('Classes Names:', classes.map(c => c.name));
}

check();
