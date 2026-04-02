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
    console.log("Checking newest 5 announcements and their authors...")
    const { data, error } = await supabase
        .from('announcements')
        .select(`
            id,
            title,
            author_id,
            sender_name,
            author_p:profiles!author_id (full_name),
            author_s:staff!author_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)
    
    if (error) {
        console.log("Full join error (likely staff join invalid):", error.message)
        // Try fallback without staff join
        const { data: d2 } = await supabase
            .from('announcements')
            .select(`
                id,
                title,
                author_id,
                sender_name,
                author:profiles!author_id (full_name)
            `)
            .order('created_at', { ascending: false })
            .limit(5)
        console.log("Announcements with profile join:", JSON.stringify(d2, null, 2))
        
        // Also check who the author_id is for the first one
        if (d2 && d2[0]) {
            const aid = d2[0].author_id
            console.log(`Checking details for author_id: ${aid}`)
            const { data: p } = await supabase.from('profiles').select('*').eq('id', aid)
            console.log("Matches in profiles:", p)
            const { data: s } = await supabase.from('staff').select('*').eq('id', aid)
            console.log("Matches in staff:", s)
            const { data: am } = await supabase.from('admin_members').select('*').eq('id', aid)
            console.log("Matches in admin_members:", am)
        }
    } else {
        console.log("Successfully joined staff/profiles:", JSON.stringify(data, null, 2))
    }
}
run()
