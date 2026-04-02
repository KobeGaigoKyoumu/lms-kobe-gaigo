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
    console.log("Auditing announcements for dashboard visibility...")
    
    // Check specific class match for RONY (2-13)
    const { data: ann, error } = await supabase
        .from('announcements')
        .select(`
            *,
            author:profiles!author_id (*)
        `)
        .order('created_at', { ascending: false })
        .limit(10)
    
    if (error) {
        console.error("Error:", error)
        return
    }

    console.log(`Recent 10 announcements:`)
    ann.forEach(a => {
        console.log(`- [${a.created_at}] ${a.title} | Type: ${a.target_type} | Class: ${a.target_class} | Author Obj: ${JSON.stringify(a.author)}`)
    })

    // Check profiles structure
    const { data: prof } = await supabase.from('profiles').select('*').limit(1)
    console.log("\nProfiles sample:", prof)
}
run()
