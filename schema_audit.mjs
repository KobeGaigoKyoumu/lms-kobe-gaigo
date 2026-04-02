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
    console.log("Checking physical columns of 'homework_assignments'...")
    const { data: assignments, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .limit(1)
    
    if (error) {
        console.error("Query failed:", error)
        return
    }

    if (assignments && assignments[0]) {
        console.log("Column names:", Object.keys(assignments[0]))
    } else {
        console.log("No data found in table.")
    }
}
run()
