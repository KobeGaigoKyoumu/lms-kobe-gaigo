import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.check', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabaseAnon = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

async function run() {
    console.log("RLS Check for Announcements...")
    
    const { data: anonData } = await supabaseAnon.from('announcements').select('id, title, target_type').limit(10)
    console.log(`Anon Key can see ${anonData?.length || 0} announcements.`)
    anonData?.forEach(a => console.log(`- [Anon] ${a.title} (${a.target_type})`))

    const { data: adminData } = await supabaseAdmin.from('announcements').select('id, title, target_type').limit(10)
    console.log(`Admin Key can see ${adminData?.length || 0} announcements.`)
    adminData?.forEach(a => console.log(`- [Admin] ${a.title} (${a.target_type})`))
}
run()
