import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.check', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    console.log("Auditing RLS for 'homework_assignments'...")
    
    // Check if RLS is enabled
    const { data: tables, error: tableError } = await supabase
        .from('pg_tables')
        .select('name, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', 'homework_assignments')
        .catch(() => ({ data: null }));

    console.log("Table info (if query allowed):", tables)

    // Check policies
    const { data: policies, error: polError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'homework_assignments')
    
    console.log("Policies:", policies || polError)

    // FINAL TEST: Compare public vs admin fetch for the same class
    const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_ANON_KEY)
    const { data: pubData } = await publicClient.from('homework_assignments').select('*').ilike('class_name', '2-13')
    const { data: adminData } = await supabase.from('homework_assignments').select('*').ilike('class_name', '2-13')

    console.log(`Test Fetch for 2-13:`)
    console.log(`  Public Client: ${pubData?.length || 0} records`)
    console.log(`  Admin Client: ${adminData?.length || 0} records`)
}
run()
