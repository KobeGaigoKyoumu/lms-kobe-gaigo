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
    console.log("Testing detailed joins for author...")
    const { data, error } = await supabase
        .from('announcements')
        .select(`
            id,
            title,
            author_id,
            sender_name,
            author_p:profiles!author_id (full_name),
            author_a:admin_members!author_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(3)
    
    if (error) {
        console.error("Join Error:", error.message)
        // If join fails, it means we must fetch manually or check FK
    } else {
        console.log("Joined Data:", JSON.stringify(data, null, 2))
    }
}
run()
