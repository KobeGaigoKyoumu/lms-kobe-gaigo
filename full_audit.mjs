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
    console.log("Auditing assignments for class '2-13'...")
    const { data, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('class_name', '%2-13%')
    
    if (error) {
        console.error("Error:", error)
        return
    }

    console.log(`Found ${data.length} total assignments for 2-13.`)
    data.forEach(a => {
        console.log(`- [${a.id}] ${a.title} | Deadline: ${a.deadline} | Archived: ${a.is_archived} | Release: ${a.release_date || a.released_at}`)
    })

    console.log("\nChecking ALL assignments in DB to see if any missed...")
    const { data: all } = await supabase.from('homework_assignments').select('id, title, class_name').limit(20)
    console.log("Sample assignments:", all)
}
run()
