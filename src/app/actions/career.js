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

/**
 * Fetches the exam schedules for a given student ID.
 */
export async function getStudentExamSchedules(studentId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
        .from('student_exam_schedules')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('getStudentExamSchedules error:', error)
        return []
    }

    return data
}

/**
 * Deletes a student exam schedule record.
 */
export async function deleteStudentExamSchedule(id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: 'Supabase config missing' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await supabase
        .from('student_exam_schedules')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('deleteStudentExamSchedule error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Helper to create a Supabase admin client (service role key).
 */
function getAdminSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }
    return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * 教師用: クラス別の学生一覧と進路情報を取得
 */
export async function getStudentsCareerList(className) {
    const supabase = getAdminSupabase()

    let query = supabase
        .from('students')
        .select('student_id_text, full_name, class_name, status')
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    if (className && className !== 'all') {
        query = query.eq('class_name', className)
    }

    const { data: students, error } = await query
    if (error) {
        console.error('getStudentsCareerList error:', error)
        return []
    }

    const studentIds = students.map(s => s.student_id_text)
    if (studentIds.length === 0) return []

    const { data: careerData } = await supabase
        .from('student_career_info')
        .select('*')
        .in('student_id', studentIds)

    const careerMap = new Map((careerData || []).map(c => [c.student_id, c]))

    return students.map(s => ({
        ...s,
        career_info: careerMap.get(s.student_id_text) || null
    }))
}

/**
 * 教師用: クラス別の学生一覧と入試予定を取得
 */
export async function getStudentsExamSchedulesList(className) {
    const supabase = getAdminSupabase()

    let query = supabase
        .from('students')
        .select('student_id_text, full_name, class_name, status')
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    if (className && className !== 'all') {
        query = query.eq('class_name', className)
    }

    const { data: students, error } = await query
    if (error) {
        console.error('getStudentsExamSchedulesList error:', error)
        return []
    }

    const studentIds = students.map(s => s.student_id_text)
    if (studentIds.length === 0) return []

    const { data: schedules } = await supabase
        .from('student_exam_schedules')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: true })

    const schedMap = new Map()
    for (const sched of (schedules || [])) {
        if (!schedMap.has(sched.student_id)) {
            schedMap.set(sched.student_id, [])
        }
        schedMap.get(sched.student_id).push(sched)
    }

    return students.map(s => ({
        ...s,
        exam_schedules: schedMap.get(s.student_id_text) || []
    }))
}

/**
 * 教師用: クラス別の学生一覧と入試アンケートを取得
 */
export async function getStudentsExamSurveysList(className) {
    const supabase = getAdminSupabase()

    let query = supabase
        .from('students')
        .select('student_id_text, full_name, class_name, status')
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    if (className && className !== 'all') {
        query = query.eq('class_name', className)
    }

    const { data: students, error } = await query
    if (error) {
        console.error('getStudentsExamSurveysList error:', error)
        return []
    }

    const studentIds = students.map(s => s.student_id_text)
    if (studentIds.length === 0) return []

    const { data: surveys } = await supabase
        .from('student_exam_surveys')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: true })

    const surveyMap = new Map()
    for (const survey of (surveys || [])) {
        if (!surveyMap.has(survey.student_id)) {
            surveyMap.set(survey.student_id, [])
        }
        surveyMap.get(survey.student_id).push(survey)
    }

    return students.map(s => ({
        ...s,
        exam_surveys: surveyMap.get(s.student_id_text) || []
    }))
}

/**
 * 教師用: 学生の進路情報を保存（管理者として）
 */
export async function saveStudentCareerInfoByAdmin(studentId, formData) {
    const supabase = getAdminSupabase()

    const { error } = await supabase
        .from('student_career_info')
        .upsert({
            student_id: studentId,
            ...formData,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id'
        })

    if (error) {
        console.error('saveStudentCareerInfoByAdmin error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/career')
    return { success: true }
}

/**
 * 教師用: 学生の入試予定を一括保存（既存を全削除→新規挿入）
 */
export async function saveStudentExamSchedules(studentId, schedules) {
    const supabase = getAdminSupabase()

    // 既存の入試予定を全削除
    const { error: deleteError } = await supabase
        .from('student_exam_schedules')
        .delete()
        .eq('student_id', studentId)

    if (deleteError) {
        console.error('saveStudentExamSchedules delete error:', deleteError)
        return { success: false, error: deleteError.message }
    }

    // 新しいデータを挿入
    if (schedules.length > 0) {
        const rows = schedules.map(s => ({
            student_id: studentId,
            school_name: s.school_name,
            department_name: s.department_name || '',
            application_period: s.application_period || '',
            exam_date: s.exam_date || '',
            results_date: s.results_date || '',
            status: s.status || '結果待ち'
        }))

        const { error: insertError } = await supabase
            .from('student_exam_schedules')
            .insert(rows)

        if (insertError) {
            console.error('saveStudentExamSchedules insert error:', insertError)
            return { success: false, error: insertError.message }
        }
    }

    return { success: true }
}

/**
 * 教師用: 学生の入試アンケート回答を保存
 */
export async function saveStudentExamSurvey(payload) {
    const supabase = getAdminSupabase()

    const { id, ...rest } = payload

    if (id) {
        // 既存レコードの更新
        const { error } = await supabase
            .from('student_exam_surveys')
            .update({
                ...rest,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            console.error('saveStudentExamSurvey update error:', error)
            return { success: false, error: error.message }
        }
    } else {
        // 新規挿入
        const { error } = await supabase
            .from('student_exam_surveys')
            .insert({
                ...rest,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('saveStudentExamSurvey insert error:', error)
            return { success: false, error: error.message }
        }
    }

    return { success: true }
}

/**
 * 教師用: 学生の入試アンケート回答を削除
 */
export async function deleteStudentExamSurvey(surveyId) {
    const supabase = getAdminSupabase()

    const { error } = await supabase
        .from('student_exam_surveys')
        .delete()
        .eq('id', surveyId)

    if (error) {
        console.error('deleteStudentExamSurvey error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
