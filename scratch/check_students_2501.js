const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.preview.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspect() {
    // 1. DANG PHI HUNG の確認
    const { data: hung, error: err1 } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', '2501003')
        .maybeSingle()
    
    if (err1) {
        console.error('Error fetching DANG PHI HUNG:', err1)
    } else {
        console.log('DANG PHI HUNG info:', hung)
    }

    // 2. 「2501」で始まる学生の件数とステータス内訳
    const { data: students2501, error: err2 } = await supabase
        .from('students')
        .select('student_id_text, full_name, status, class_name')
        .like('student_id_text', '2501%')
    
    if (err2) {
        console.error('Error fetching 2501 students:', err2)
    } else {
        console.log('Total students starting with "2501":', students2501.length)
        const statusCounts = {}
        students2501.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
        })
        console.log('Status breakdown for 2501 students:', statusCounts)
        
        // Active な学生のサンプル
        const active2501 = students2501.filter(s => s.status === 'active')
        console.log('Active 2501 students count:', active2501.length)
        if (active2501.length > 0) {
            console.log('Sample active 2501 students (first 5):', active2501.slice(0, 5))
        }
    }
}

inspect()
