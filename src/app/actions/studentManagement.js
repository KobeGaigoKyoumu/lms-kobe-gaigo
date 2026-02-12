'use server'

import { createClient } from '@/lib/supabase/client'
import { revalidateTag } from 'next/cache'

const getSupabase = async () => {
    return createClient()
}

export const updateStudentStatus = async (studentId, newStatus) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('student_id_text', studentId)

    if (error) throw error

    revalidateTag('students')
    return { success: true }
}

export const updateStudentGrade = async (studentId, newAcademicYear) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .update({ academic_year: newAcademicYear })
        .eq('student_id_text', studentId)

    if (error) throw error

    revalidateTag('students')
    return { success: true }
}

export const deleteStudent = async (studentId) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id_text', studentId)

    if (error) throw error

    revalidateTag('students')
    return { success: true }
}

export const bulkDeleteStudents = async (studentIds) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .delete()
        .in('student_id_text', studentIds)

    if (error) throw error

    revalidateTag('students')
    return { success: true }
}

export const resetAllGrades = async () => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .update({ academic_year: null })
        .neq('student_id_text', '______') // Dummy condition to match all

    if (error) throw error

    revalidateTag('students')
    return { success: true }
}
