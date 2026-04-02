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
    console.log("Auditing RONY's submissions (2504216)...")
    const { data: subs, error } = await supabase
        .from('homework_submissions')
        .select(`
            id,
            assignment_id,
            status,
            homework_assignments:assignment_id (
                id,
                title,
                class_name,
                deadline
            )
        `)
        .eq('student_id_text', '2504216')
    
    if (error) {
        console.error("Error:", error)
        return
    }

    console.log(`Found ${subs.length} total submissions.`)
    subs.forEach(s => {
        const a = s.homework_assignments
        console.log(`- Sub: ${s.status} | Asgn: [${a?.id}] ${a?.title} | Class: ${a?.class_name}`)
    })
}
run()
