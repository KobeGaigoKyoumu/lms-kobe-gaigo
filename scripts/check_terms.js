require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
    const { data: students, error: err1 } = await supabase.from('students').select('academic_year, class_name').limit(10)
    console.log("Sample students:", students)
    
    const { data: terms, error: err2 } = await supabase.from('students').select('academic_year')
    if (terms) {
        const uniqueTerms = [...new Set(terms.map(t => t.academic_year))].filter(Boolean)
        console.log("Unique Academic Years:", uniqueTerms)
    }
}
check()
