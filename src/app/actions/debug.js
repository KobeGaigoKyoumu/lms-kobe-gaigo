'use server'

import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function getSessionDebug() {
    try {
        const session = await getStudentSession()
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))

        const supabase = createClient()
        let studentData = null
        if (session?.studentId) {
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('student_id_text', session.studentId)
                .single()
            studentData = data
        }

        // Fetch distinct class names from assignments to check for mismatches
        const { data: assignments } = await supabase
            .from('homework_assignments')
            .select('class_name')

        // Get unique class names and counts
        const classCounts = {}
        assignments?.forEach(a => {
            const c = a.class_name || 'NULL'
            classCounts[c] = (classCounts[c] || 0) + 1
        })

        // Check if there are assignments for the current session's class
        const currentClassAssignments = classCounts[session?.className] || 0;

        return {
            session,
            cookies: allCookies,
            studentData,
            assignmentStats: {
                totalAssignments: assignments?.length || 0,
                availableClasses: classCounts,
                assignmentsForYourClass: currentClassAssignments
            }
        }
    } catch (e) {
        return { error: e.message }
    }
}
