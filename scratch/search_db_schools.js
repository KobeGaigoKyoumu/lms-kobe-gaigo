const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function search(keyword) {
    const { data, error } = await supabase
        .from('master_schools')
        .select('name')
        .ilike('name', `%${keyword}%`);

    console.log(`Keyword: "${keyword}" -> Found: ${data?.length || 0}`);
    data?.forEach(d => console.log(`  - ${d.name}`));
}

async function main() {
    await search('駿台');
    await search('栃木');
    await search('麻生');
    await search('岩谷');
    await search('阪神');
    await search('デザイン');
    await search('国際ビジネスカレッジ');
}

main();
