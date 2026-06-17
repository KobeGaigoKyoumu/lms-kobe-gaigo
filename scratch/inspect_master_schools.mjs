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
    console.log("Checking master_schools counts by type...")
    
    // school_type ごとにカウントする
    const types = ['university', 'junior_college', 'vocational_school', 'graduate_school', 'technical_college']
    for (const t of types) {
        const { count, error } = await supabase
            .from('master_schools')
            .select('*', { count: 'exact', head: true })
            .eq('school_type', t)
        
        if (error) {
            console.error(`Error fetching count for ${t}:`, error.message)
        } else {
            console.log(`Type: ${t} - Count: ${count}`)
        }
    }
}
run()
