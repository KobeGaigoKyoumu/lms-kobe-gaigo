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
    console.log("Deep Audit of class '2-13' assignments...")
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .ilike('class_name', '%2%13%')
    
    if (assignments) {
        assignments.forEach(a => {
            console.log(`\nID: ${a.id} | Title: ${a.title}`)
            console.log(`Class: "${a.class_name}" (len: ${a.class_name?.length})`)
            console.log(`Archived: ${a.is_archived} | Released: ${a.released_at}`)
            console.log(`Hex: ${Buffer.from(a.class_name || '').toString('hex')}`)
        })
    }

    console.log("\nChecking RONY's class hex...")
    const { data: students } = await supabase
        .from('students')
        .select('class_name')
        .eq('full_name', 'RONY MD MAHMUD HASAN')
    
    if (students) {
        students.forEach(s => {
            console.log(`Class: "${s.class_name}" (len: ${s.class_name?.length})`)
            console.log(`Hex: ${Buffer.from(s.class_name || '').toString('hex')}`)
        })
    }
}
run()
