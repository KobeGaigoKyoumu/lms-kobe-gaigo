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
    const sid = '2504216'
    console.log(`Checking Course Enrollments for student ${sid}...`)
    
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses(title)')
        .eq('student_id', sid)
    
    console.log('Enrollments:', JSON.stringify(enrollments, null, 2))

    const { data: ann } = await supabase.from('announcements').select('id, title, course_id').order('created_at', { ascending: false }).limit(5)
    console.log('Latest Announcements and their courses:', JSON.stringify(ann, null, 2))
}
run()
