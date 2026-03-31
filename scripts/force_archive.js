const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting bulk archive of homework_assignments...");
  const { data, error } = await supabase
    .from('homework_assignments')
    .update({ is_archived: true })
    .eq('is_archived', false)
    .select();

  if (error) {
    console.error("Error archiving assignments:", error);
  } else {
    console.log(`Successfully archived ${data ? data.length : 0} assignments.`);
  }
}

run();
