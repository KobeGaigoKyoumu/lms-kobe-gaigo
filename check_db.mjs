import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Checking assignments for class_name 2-13...")
    const { data: assignments } = await supabase.from('homework_assignments').select('*').limit(20)
    if (assignments) {
        assignments.forEach(a => console.log('Assign ID:', a.id, 'Class Name:', JSON.stringify(a.class_name), 'Released At:', a.released_at, 'Deadline:', a.deadline))
    }

    console.log("Checking students for class 2-13...")
    const { data: student } = await supabase.from('students').select('*').limit(5)
    if (student) {
        student.forEach(s => console.log('Student:', s.student_id_text, 'Class Name:', JSON.stringify(s.class_name)))
    }
}
run()
