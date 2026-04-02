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
    console.log("Detailed Audit for class '2-13' assignments...")
    const { data: assignments, error: assError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('class_name', '2-13')
    
    if (assError) {
        console.error("Assignment Error:", assError)
    } else {
        console.log(`Found ${assignments.length} assignments for '2-13' (exact match)`)
        assignments.forEach(a => {
            console.log(`- ID: ${a.id} | Title: ${a.title} | Archived: ${a.is_archived} | Released: ${a.released_at} | Class: "${a.class_name}"`)
        })
    }

    const { data: fuzzyAssignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('class_name', '%2%13%')
    
    console.log(`\nFound ${fuzzyAssignments?.length || 0} assignments for '%2%13%' (fuzzy match)`)
    fuzzyAssignments?.forEach(a => {
        if (a.class_name !== '2-13') {
            console.log(`- DIFF: "${a.class_name}" (Title: ${a.title})`)
        }
    })

    console.log("\nChecking student RONY's exact class...")
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('full_name', 'RONY MD MAHMUD HASAN')
    
    if (students) {
        students.forEach(s => {
            console.log(`Name: ${s.full_name} | Class: "${s.class_name}" (len: ${s.class_name?.length})`)
        })
    }
}
run()
