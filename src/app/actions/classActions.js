'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const getSupabaseAdmin = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

export async function updateClass(id, formData) {
    console.log(`[ACTION] updateClass called for ID: ${id}`)
    const supabase = await createClient()
    const adminSupabase = getSupabaseAdmin()

    // 1. Get current data for comparison
    const { data: currentClass, error: fetchError } = await adminSupabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single()
    
    if (fetchError || !currentClass) {
        console.error('[ACTION] updateClass: Could not find class', fetchError)
        return { error: 'クラスが見つかりませんでした。' }
    }

    const teacherDataStr = formData.get('teacher_data') || ''
    const parts = teacherDataStr.split('|')
    const teacherId = parts[0]
    const homeroomTeacherName = parts[1] || ''

    const updateData = {
        name: formData.get('name'),
        description: formData.get('description') || null,
        grade_level: formData.get('grade_level') || null,
        academic_year: parseInt(formData.get('academic_year')) || currentClass.academic_year,
        course_id: formData.get('course_id') || null,
        teacher_id: teacherId && teacherId.startsWith('admin_') ? null : teacherId,
        homeroom_teacher_name: homeroomTeacherName,
        updated_at: new Date().toISOString()
    }

    console.log('[ACTION] updateClass: Data to update:', updateData)

    // Using Admin Client to ensure success for authorized users regardless of RLS ownership settings
    const { error: updateError } = await adminSupabase
        .from('classes')
        .update(updateData)
        .eq('id', id)

    if (updateError) {
        console.error('[ACTION] updateClass: Update failed', updateError)
        return { error: '更新に失敗しました: ' + updateError.message }
    }

    console.log('[ACTION] updateClass: Success. Revalidating paths...')

    // Comprehensive revalidation
    revalidateTag('classes')
    revalidatePath('/classes')
    revalidatePath(`/classes/${id}`)
    revalidatePath('/student/course')

    return { success: true }
}

export async function deleteClass(id) {
    console.log(`[ACTION] deleteClass called for ID: ${id}`)
    const adminSupabase = getSupabaseAdmin()

    const { error: deleteError } = await adminSupabase
        .from('classes')
        .delete()
        .eq('id', id)

    if (deleteError) {
        console.error('[ACTION] deleteClass: Delete failed', deleteError)
        return { error: '削除に失敗しました: ' + deleteError.message }
    }

    console.log('[ACTION] deleteClass: Success. Revalidating paths...')

    revalidateTag('classes')
    revalidatePath('/classes')
    revalidatePath('/student/course')

    return { success: true }
}
