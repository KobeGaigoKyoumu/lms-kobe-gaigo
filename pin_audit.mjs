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
    console.log("Checking dashboard announcement sort/pin issues...")
    const { data: ann } = await supabase
        .from('announcements')
        .select('title, is_pinned, created_at, target_type, target_class')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)
    
    ann.forEach(a => {
        console.log(`- [${a.is_pinned ? 'PIN' : ' - '}] ${a.title} | ${a.created_at} | ${a.target_type} | ${a.target_class}`)
    })
}
run()
