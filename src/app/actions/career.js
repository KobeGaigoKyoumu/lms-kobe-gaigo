'use server'

import { createClient } from '@supabase/supabase-js'
import { getStudentSessionLight } from './studentAuth'
import { revalidatePath } from 'next/cache'

/**
 * Fetches the career counseling info for the current student.
 */
export async function getStudentCareerInfo() {
    const session = await getStudentSessionLight()
    if (!session) return null

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
        .from('student_career_info')
        .select('*')
        .eq('student_id', session.studentId)
        .maybeSingle()

    if (error) {
        console.error('getStudentCareerInfo error:', error)
        return null
    }

    return data
}

/**
 * Saves/Upserts the student's career counseling info responses.
 */
export async function saveStudentCareerInfo(formData) {
    const session = await getStudentSessionLight()
    if (!session) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: 'Supabase configuration missing' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const studentId = session.studentId

    const { data, error } = await supabase
        .from('student_career_info')
        .upsert({
            student_id: studentId,
            ...formData,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id'
        })

    if (error) {
        console.error('saveStudentCareerInfo error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/student/career')
    return { success: true }
}
