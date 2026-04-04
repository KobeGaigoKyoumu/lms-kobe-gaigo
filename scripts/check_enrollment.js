require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
    const { data: terms, error: err2 } = await supabase.from('students').select('enrollment_period')
    if (terms) {
        const uniqueTerms = [...new Set(terms.map(t => t.enrollment_period))].filter(Boolean)
        console.log("Unique Enrollment Periods:", uniqueTerms)
    } else {
        console.error(err2)
    }
}
check()
