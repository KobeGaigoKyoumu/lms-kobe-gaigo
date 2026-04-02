import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.check', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

async function run() {
    console.log("Checking RLS status for 'homework_assignments'...")
    const { data: policies, error } = await supabase
        .rpc('get_policies', { table_name_v2: 'homework_assignments' }) // Try common RPC name
        .catch(e => ({ error: e }));

    // Fallback: Query system tables directly if RPC fails
    const { data: pgPolicies, error: pgError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'homework_assignments')

    if (pgError) {
        console.log("Could not fetch policies via pg_policies (likely RLS blocked or no permission).")
    } else {
        console.log("Policies found:", pgPolicies)
    }

    const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { p_table_name: 'homework_assignments' })
    
    if (tableInfo) {
        console.log("Table info:", tableInfo)
    }
}
run()
