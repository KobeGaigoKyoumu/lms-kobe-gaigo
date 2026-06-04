const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.preview.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getPolicies() {
    const { data, error } = await supabase
        .rpc('execute_sql', { sql_query: "SELECT * FROM pg_policies WHERE tablename = 'students';" })
    
    if (error) {
        // execute_sql RPCがない場合は、直接pg_policiesは叩けないため、情報取得用のクエリを投げてみます
        // SupabaseではRPCがない場合、生のクエリを実行するAPIはありません。
        // 代わりに、migrationの履歴を確認するか、テストアカウントでログインして検証します。
        console.error('RPC Error:', error)
        
        // 代替案: profiles の一覧を取得してみる
        const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'teacher')
            .limit(1)
        
        if (profErr) {
            console.error('Error fetching teacher profile:', profErr)
        } else {
            console.log('Sample Teacher Profile:', profiles)
        }
    } else {
        console.log('Students Table Policies:', data)
    }
}

getPolicies()
