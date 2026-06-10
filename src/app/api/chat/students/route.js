import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Grade Calculation Logic (Synced with April 1st promo rule)
function calculateGrade(studentId, year, month) {
    if (!studentId || studentId.length < 2) return 0
    if (studentId.startsWith('23')) return 0 // Non-enrolled as per user request
    const enrollmentYearShort = parseInt(studentId.substring(0, 2), 10)
    let enrollmentYear = 2000 + enrollmentYearShort
    if (studentId.length >= 4) {
        const enrollmentMonth = parseInt(studentId.substring(2, 4), 10)
        if (enrollmentMonth >= 1 && enrollmentMonth <= 3) {
            enrollmentYear -= 1
        }
    }
    const academicYear = month >= 4 ? year : year - 1
    let grade = academicYear - enrollmentYear + 1
    if (grade > 2 || grade < 0) return 0
    return grade
}

export async function GET(request) {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        const adminMember = await getAdminMemberSession()

        // Allow access if either Supabase user OR adminMember exists
        if (!user && !adminMember) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1

        // 1. Fetch Students
        const { data: students, error: studentError } = await adminSupabase
            .from('students')
            .select('student_id_text, full_name, class_name')
            .order('student_id_text', { ascending: true })

        if (studentError) throw studentError

        const enrichedStudents = (students || []).map(s => ({
            ...s,
            grade: calculateGrade(s.student_id_text, year, month)
        }))

        // 2. Fetch Admin Members (to allow messaging staff)
        const { data: staff, error: staffError } = await adminSupabase
            .from('admin_members')
            .select('id, name, role')
            .order('name', { ascending: true })

        if (staffError) {
            console.error('Staff fetch error (optional):', staffError)
        }

        const staffList = (staff || []).map(s => ({
            student_id_text: s.id, // Use as unique key
            full_name: `${s.name} (${s.role === 'admin' ? '管理者' : '教職員'})`,
            class_name: '教職員',
            grade: 0,
            isStaff: true
        }))

        return NextResponse.json({ 
            students: enrichedStudents,
            staff: staffList,
            all: [...enrichedStudents, ...staffList] 
        })
    } catch (error) {
        console.error('Chat Students API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
