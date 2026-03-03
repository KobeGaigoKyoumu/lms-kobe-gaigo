const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .ilike('full_name', '%KHADKA YOGENDRA%')

    console.log("students table result:", data, error)

    const { data: data2, error: error2 } = await supabase
        .from('profiles')
        .select('id, student_id_text, full_name')
        .ilike('full_name', '%KHADKA YOGENDRA%')

    console.log("profiles table result:", data2, error2)

    // fallback partial match
    const { data: data3 } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .ilike('full_name', '%KHADKA%')
    console.log("students table KHADKA result count:", data3?.length)
    if (data3) {
        console.log(data3.find(d => d.full_name.includes('YOGENDRA')))
    }
}

check()
