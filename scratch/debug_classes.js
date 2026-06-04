const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.preview.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debug() {
    // 1. Get total students count
    const { count: totalCount, error: err1 } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
    
    if (err1) {
        console.error('Error fetching total count:', err1)
    } else {
        console.log('Total students in DB:', totalCount)
    }

    // 2. Get students count by status
    const { data: statusData, error: err2 } = await supabase
        .from('students')
        .select('status')
    
    if (err2) {
        console.error('Error fetching status data:', err2)
    } else {
        const statusCounts = {}
        statusData.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
        })
        console.log('Students count by status:', statusCounts)
    }

    // 3. Get students count for "2-14" class
    const { data: class14Students, error: err3 } = await supabase
        .from('students')
        .select('student_id_text, full_name, status, class_name')
        .eq('class_name', '2-14')
    
    if (err3) {
        console.error('Error fetching 2-14 class students:', err3)
    } else {
        console.log('Students in "2-14" (exact match):', class14Students.length)
        if (class14Students.length > 0) {
            console.log('Sample students from 2-14:', class14Students.slice(0, 3))
        }
    }

    // 4. Get active students counts by class_name
    const { data: activeStudents, error: err4 } = await supabase
        .from('students')
        .select('class_name')
        .eq('status', 'active')
    
    if (err4) {
        console.error('Error fetching active students:', err4)
    } else {
        const classCounts = {}
        activeStudents.forEach(s => {
            if (s.class_name) {
                classCounts[s.class_name] = (classCounts[s.class_name] || 0) + 1
            }
        })
        console.log('Active students count by class (realtime):', classCounts)
    }
}

debug()
