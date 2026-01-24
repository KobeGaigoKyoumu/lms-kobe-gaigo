const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log("Checking ID 2010029 details...");
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', '2010029');

    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data[0], null, 2));
}

check();
