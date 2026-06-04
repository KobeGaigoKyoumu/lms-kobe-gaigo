const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRpc(name, args) {
    console.log(`Testing RPC '${name}' with args:`, JSON.stringify(args));
    try {
        const { data, error } = await supabase.rpc(name, args);
        if (error) {
            console.log(`  -> Error: ${error.message}`);
            return false;
        } else {
            console.log(`  -> SUCCESS! Data:`, data);
            return true;
        }
    } catch (e) {
        console.log(`  -> Exception: ${e.message}`);
        return false;
    }
}

async function main() {
    // さまざまなバリエーションをテスト
    const tests = [
        { name: 'exec_sql', args: {} },
        { name: 'exec_sql', args: { query: 'SELECT 1' } },
        { name: 'exec_sql', args: { sql: 'SELECT 1' } },
        { name: 'exec_sql', args: { sql_query: 'SELECT 1' } },
        
        { name: 'execute_sql', args: {} },
        { name: 'execute_sql', args: { query: 'SELECT 1' } },
        { name: 'execute_sql', args: { sql: 'SELECT 1' } },
        { name: 'execute_sql', args: { sql_query: 'SELECT 1' } },

        { name: 'run_sql', args: {} },
        { name: 'run_sql', args: { query: 'SELECT 1' } },
        { name: 'run_sql', args: { sql: 'SELECT 1' } },
    ];

    for (const test of tests) {
        const ok = await testRpc(test.name, test.args);
        if (ok) {
            console.log(`Found working RPC: ${test.name}`);
            break;
        }
    }
}

main();
