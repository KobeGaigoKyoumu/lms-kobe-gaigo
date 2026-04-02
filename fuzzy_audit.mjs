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
    console.log("Searching for the assignment across all classes...")
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('title', '%ポイント%')
    
    if (assignments && assignments.length > 0) {
        console.log(`Found ${assignments.length} assignments matching 'ポイント'`)
        assignments.forEach(a => {
            console.log(`- ID: ${a.id} | Title: ${a.title} | Class: "${a.class_name}" | Archived: ${a.is_archived}`)
        })
    } else {
        console.log("No assignments found with title containing 'ポイント'")
    }

    console.log("\nChecking RONY MD MAHMUD HASAN's ID...")
    const { data: students } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .eq('full_name', 'RONY MD MAHMUD HASAN')
    
    if (students && students.length > 0) {
        students.forEach(s => {
            console.log(`Student: ${s.full_name} | ID: "${s.student_id_text}" | Class: "${s.class_name}"`)
        })
    }
}
run()
