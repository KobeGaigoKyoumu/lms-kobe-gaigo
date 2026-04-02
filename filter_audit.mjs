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
    const normalize = (name) => {
        if (!name) return ''
        return typeof name === 'string' 
            ? name.trim()
                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                .replace(/[－ー—―]/g, '-')
                .replace(/\s+/g, '') 
            : name
    }

    console.log("Auditing Announcement Filters...")
    
    // Check student session for 2504216 (RONY)
    const { data: students } = await supabase.from('students').select('*').eq('student_id_text', '2504216').single()
    const sessionClassName = students?.class_name
    console.log(`Student Class (DB): "${sessionClassName}" | Normalized: "${normalize(sessionClassName)}"`)

    const { data: ann } = await supabase.from('announcements').select('id, title, target_type, target_class, created_at').order('created_at', { ascending: false }).limit(5)
    
    ann.forEach(a => {
        const matchesType = !a.target_type || a.target_type === 'all'
        const matchesClass = a.target_type === 'class' && normalize(a.target_class) === normalize(sessionClassName)
        console.log(`Ann: "${a.title}" | Target: ${a.target_type} | Target Class: "${a.target_class}" | Matches (Type): ${matchesType} | Matches (Class): ${matchesClass}`)
    })
}
run()
