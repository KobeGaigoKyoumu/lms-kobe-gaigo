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
    
    console.log("--- Homework Assignments for '2-13' ---")
    const { data: assignments, error: asError } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('class_name', '%2-13%')
    
    if (asError) console.error(asError)
    if (assignments) {
        assignments.forEach(a => {
            console.log(`ID: ${a.id}`)
            console.log(`Title: ${a.title}`)
            console.log(`Class: "${a.class_name}" (len: ${a.class_name.length})`)
            console.log(`Released: ${a.released_at}`)
            console.log(`Archived: ${a.is_archived}`)
            console.log(`Deadline: ${a.deadline}`)
            console.log("---")
        })
    }

    console.log("\n--- Student RONY ---")
    const { data: student, error: stError } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%RONY%')
        .single()
    
    if (stError) console.error(stError)
    if (student) {
        console.log(`Full Name: ${student.full_name}`)
        console.log(`Class: "${student.class_name}" (len: ${student.class_name?.length})`)
        console.log(`ID: ${student.student_id_text}`)
    }
}
run()
