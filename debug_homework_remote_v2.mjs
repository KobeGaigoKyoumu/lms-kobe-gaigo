import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Using credentials from .env.check which points to the remote Supabase
const envContent = fs.readFileSync('.env.check', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log(`Using Remote Supabase: ${supabaseUrl}`)
    
    // 1. Audit Assignments for '2-13'
    console.log("--- Assignments for class '2-13' (Searching with LIKE) ---")
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('id, title, class_name, released_at, is_archived, deadline')
        .ilike('class_name', '%2%13%') // More flexible search
    
    if (assignments) {
        assignments.forEach(a => {
            console.log(`ID: ${a.id} | Title: ${a.title} | Class: "${a.class_name}" (len: ${a.class_name.length}) | Released: ${a.released_at}`)
        })
    }

    // 2. Audit Student RONY (Searching with partial name)
    console.log("\n--- Searching for student RONY ---")
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%MAHMUD%')
    
    if (students) {
        students.forEach(s => {
            console.log(`Name: ${s.full_name} | Class: "${s.class_name}" (len: ${s.class_name?.length}) | ID: ${s.student_id_text}`)
        })
    }
}
run()
