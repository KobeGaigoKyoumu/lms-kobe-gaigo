const { getAdminMembers } = require('../src/app/actions/adminAuth');

async function main() {
    // 環境変数の設定 (Next.jsが起動している環境に合わせる)
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
    // DBへのサービスロールキーなどを設定（Cookie等からロードされたものを使用）
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

    try {
        const members = await getAdminMembers();
        console.log('--- ADMIN MEMBERS ---');
        members.forEach(m => {
            console.log(`Name: ${m.name}, Password: ${m.password}`);
        });
    } catch (e) {
        console.error('Error fetching admin members:', e);
    }
}

main();
