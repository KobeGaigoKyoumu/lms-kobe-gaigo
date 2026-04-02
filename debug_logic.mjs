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
    console.log("Checking class '2-13' assignments...")
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('class_name', '%2%13%')
    
    if (assignments) {
        assignments.forEach(a => {
            console.log(`Title: ${a.title} | Archived: ${a.is_archived} | Released: ${a.released_at} | Deadline: ${a.deadline}`)
        })
    }

    console.log("\nChecking student RONY...")
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%MAHMUD%')
    
    if (students) {
        students.forEach(s => {
            console.log(`Name: ${s.full_name} | Class: "${s.class_name}" | Year: ${s.academic_year}`)
        })
    }
}
run()
