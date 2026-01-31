
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGradeRecords() {
    console.log('Fetching one grade record...');
    const { data, error } = await supabase
        .from('grade_records')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No records found.');
        return;
    }

    const record = data[0];
    console.log('Record ID:', record.id);
    console.log('Student ID:', record.student_id_text);
    console.log('Report Card Data Structure:');
    console.log(JSON.stringify(record.report_card_data, null, 2));

    // Also check if there are columns related to attendance in the record itself, though logic is pulling from report_card_data
}

inspectGradeRecords();
