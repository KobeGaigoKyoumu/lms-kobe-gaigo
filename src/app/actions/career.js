'use server'

import { createClient } from '@supabase/supabase-js'
import { getStudentSessionLight } from './studentAuth'
import { getAdminMemberSession } from './adminAuth'
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
 * Fetches the list of active students and their career counseling info for a class.
 * Accessible only to authenticated admin members/teachers.
 */
export async function getStudentsCareerList(className) {
    const session = await getAdminMemberSession()
    if (!session) return []

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build the query to get active students
    let query = supabase
        .from('students')
        .select('student_id_text, full_name, class_name, academic_year')
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    if (className && className !== 'all') {
        query = query.eq('class_name', className)
    }

    const { data: students, error: studentError } = await query

    if (studentError) {
        console.error('getStudentsCareerList students error:', studentError)
        return []
    }

    if (!students || students.length === 0) {
        return []
    }

    const studentIds = students.map(s => s.student_id_text)

    // Fetch career infos for these students
    const { data: careerInfos, error: careerError } = await supabase
        .from('student_career_info')
        .select('*')
        .in('student_id', studentIds)

    if (careerError) {
        console.error('getStudentsCareerList careerInfo error:', careerError)
        return students.map(s => ({ ...s, career_info: null }))
    }

    const careerMap = new Map(careerInfos?.map(info => [info.student_id, info]) || [])

    return students.map(student => ({
        ...student,
        career_info: careerMap.get(student.student_id_text) || null
    }))
}

/**
 * Saves/Upserts a student's career counseling info responses by an admin or teacher.
 */
export async function saveStudentCareerInfoByAdmin(studentId, formData) {
    const session = await getAdminMemberSession()
    if (!session) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: 'Supabase configuration missing' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
        console.error('saveStudentCareerInfoByAdmin error:', error)
        return { success: false, error: error.message }
    }

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
    return data || []
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
 * Saves/Replaces the student's exam schedules list.
 * Can be used by both student themselves or teacher/admin.
 */
export async function saveStudentExamSchedules(studentId, schedules) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: 'Supabase config missing' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Delete existing schedules for this student
    const { error: deleteError } = await supabase
        .from('student_exam_schedules')
        .delete()
        .eq('student_id', studentId)

    if (deleteError) {
        console.error('saveStudentExamSchedules delete error:', deleteError)
        return { success: false, error: deleteError.message }
    }

    // Insert new schedules if list is not empty
    if (schedules && schedules.length > 0) {
        // Validate each schedule has school_name and department_name
        for (const s of schedules) {
            if (!s.school_name || !s.school_name.trim() || !s.department_name || !s.department_name.trim()) {
                return { success: false, error: '受験予定校と学部・学科・コースは必須です。' }
            }
        }

        const rowsToInsert = schedules.map(s => ({
            student_id: studentId,
            school_name: s.school_name.trim(),
            department_name: s.department_name.trim(),
            application_period: s.application_period || '',
            exam_date: s.exam_date || '',
            results_date: s.results_date || '',
            status: s.status || '結果待ち'
        }))

        const { error: insertError } = await supabase
            .from('student_exam_schedules')
            .insert(rowsToInsert)

        if (insertError) {
            console.error('saveStudentExamSchedules insert error:', insertError)
            return { success: false, error: insertError.message }
        }
    }

    revalidatePath('/student/career')
    revalidatePath('/career')
    return { success: true }
}

/**
 * Fetches the list of active students and their exam schedules for a class.
 * Accessible only to authenticated admin members/teachers.
 */
export async function getStudentsExamSchedulesList(className) {
    const session = await getAdminMemberSession()
    if (!session) return []

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get active students
    let query = supabase
        .from('students')
        .select('student_id_text, full_name, class_name, academic_year')
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    if (className && className !== 'all') {
        query = query.eq('class_name', className)
    }

    const { data: students, error: studentError } = await query
    if (studentError) {
        console.error('getStudentsExamSchedulesList students error:', studentError)
        return []
    }

    if (!students || students.length === 0) {
        return []
    }

    const studentIds = students.map(s => s.student_id_text)

    // Fetch exam schedules for these students
    const { data: schedules, error: scheduleError } = await supabase
        .from('student_exam_schedules')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: true })

    if (scheduleError) {
        console.error('getStudentsExamSchedulesList schedules error:', scheduleError)
        return students.map(s => ({ ...s, exam_schedules: [] }))
    }

    // Group by student_id
    const schedulesMap = new Map()
    schedules?.forEach(s => {
        if (!schedulesMap.has(s.student_id)) {
            schedulesMap.set(s.student_id, [])
        }
        schedulesMap.get(s.student_id).push(s)
    })

    return students.map(student => ({
        ...student,
        exam_schedules: schedulesMap.get(student.student_id_text) || []
    }))
}

/**
 * Fetches the exam surveys for a student.
 */
export async function getStudentExamSurveys(studentId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
        .from('student_exam_surveys')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getStudentExamSurveys error:', error)
        return []
    }

    return data || []
}

/**
 * Saves/Creates/Updates a student's exam survey response.
 */
export async function saveStudentExamSurvey(surveyData) {
    const studentSession = await getStudentSessionLight()
    const adminSession = await getAdminMemberSession()
    
    if (!studentSession && !adminSession) {
        return { success: false, error: 'Unauthorized' }
    }
    
    const studentId = studentSession ? studentSession.studentId : surveyData.student_id
    if (!studentId) {
        return { success: false, error: '学籍番号が必要です。' }
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: 'Supabase configuration missing' }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const dataToSave = {
        student_id: studentId,
        class_name: surveyData.class_name,
        student_name: surveyData.student_name,
        school_type: surveyData.school_type,
        school_name: surveyData.school_name,
        exam_date: surveyData.exam_date,
        department_name: surveyData.department_name,
        exam_type: surveyData.exam_type,
        essay_exists: surveyData.essay_exists,
        essay_time: surveyData.essay_time,
        essay_theme: surveyData.essay_theme,
        japanese_exists: surveyData.japanese_exists,
        japanese_time: surveyData.japanese_time,
        japanese_level: surveyData.japanese_level,
        japanese_content: surveyData.japanese_content, // Should be passed as text (stringified JSON) or handled as TEXT
        interview_exists: surveyData.interview_exists,
        interview_time: surveyData.interview_time,
        interview_teachers: surveyData.interview_teachers,
        interview_students: surveyData.interview_students,
        interview_question_1: surveyData.interview_question_1,
        interview_question_2: surveyData.interview_question_2,
        interview_question_3: surveyData.interview_question_3,
        interview_question_4: surveyData.interview_question_4,
        interview_question_5: surveyData.interview_question_5,
        other_exam_exists: surveyData.other_exam_exists,
        other_exam_content: surveyData.other_exam_content,
        other_exam_time: surveyData.other_exam_time,
        advice: surveyData.advice,
        updated_at: new Date().toISOString()
    }
    
    let result;
    if (surveyData.id) {
        // Update
        result = await supabase
            .from('student_exam_surveys')
            .update(dataToSave)
            .eq('id', surveyData.id)
    } else {
        // Insert
        result = await supabase
            .from('student_exam_surveys')
            .insert({
                ...dataToSave,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()
    }
    
    if (result.error) {
        console.error('saveStudentExamSurvey error:', result.error)
        return { success: false, error: result.error.message }
    }
    
    return { success: true, id: result.data?.id }
}

/**
 * Deletes a student's exam survey response.
 */
export async function deleteStudentExamSurvey(surveyId) {
    const studentSession = await getStudentSessionLight()
    const adminSession = await getAdminMemberSession()
    
    if (!studentSession && !adminSession) {
        return { success: false, error: 'Unauthorized' }
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: 'Supabase configuration missing' }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
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

/**
 * Fetches active students and their exam surveys for a class.
 */
export async function getStudentsExamSurveysList(className) {
    const session = await getAdminMemberSession()
    if (!session) return []

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get active students
    let query = supabase
        .from('students')
        .select('student_id_text, full_name, class_name, academic_year')
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    if (className && className !== 'all') {
        query = query.eq('class_name', className)
    }

    const { data: students, error: studentError } = await query
    if (studentError) {
        console.error('getStudentsExamSurveysList students error:', studentError)
        return []
    }

    if (!students || students.length === 0) {
        return []
    }

    const studentIds = students.map(s => s.student_id_text)

    // Fetch surveys
    const { data: surveys, error: surveyError } = await supabase
        .from('student_exam_surveys')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })

    if (surveyError) {
        console.error('getStudentsExamSurveysList surveys error:', surveyError)
        return students.map(s => ({ ...s, exam_surveys: [] }))
    }

    const surveysMap = new Map()
    surveys?.forEach(s => {
        if (!surveysMap.has(s.student_id)) {
            surveysMap.set(s.student_id, [])
        }
        surveysMap.get(s.student_id).push(s)
    })

    return students.map(student => ({
        ...student,
        exam_surveys: surveysMap.get(student.student_id_text) || []
    }))
}

function getAdminSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase config missing')
    }
    return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * 学生用: 自身の入試予定を取得する
 */
export async function getStudentExamSchedulesSelf() {
    const session = await getStudentSessionLight()
    if (!session) return []

    const supabase = getAdminSupabase()
    const { data, error } = await supabase
        .from('student_exam_schedules')
        .select('*')
        .eq('student_id', session.studentId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('getStudentExamSchedulesSelf error:', error)
        return []
    }
    return data
}

/**
 * 学生用: 自身の入試アンケート回答を取得する
 */
export async function getStudentExamSurveysSelf() {
    const session = await getStudentSessionLight()
    if (!session) return []

    const supabase = getAdminSupabase()
    const { data, error } = await supabase
        .from('student_exam_surveys')
        .select('*')
        .eq('student_id', session.studentId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('getStudentExamSurveysSelf error:', error)
        return []
    }
    return data
}

/**
 * 学生用: 自身の入試予定を一括保存する
 */
export async function saveStudentExamSchedulesSelf(schedules) {
    const session = await getStudentSessionLight()
    if (!session) {
        return { success: false, error: 'Unauthorized' }
    }
    
    const res = await saveStudentExamSchedules(session.studentId, schedules)
    if (res.success) {
        revalidatePath('/student/career')
    }
    return res
}

/**
 * 学生用: 自身の入試アンケートを保存する
 */
export async function saveStudentExamSurveySelf(payload) {
    const session = await getStudentSessionLight()
    if (!session) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabase = getAdminSupabase()
    if (payload.id) {
        const { data } = await supabase
            .from('student_exam_surveys')
            .select('student_id')
            .eq('id', payload.id)
            .maybeSingle()
        if (!data || data.student_id !== session.studentId) {
            return { success: false, error: 'Unauthorized' }
        }
    }

    const fullPayload = {
        ...payload,
        student_id: session.studentId,
        student_name: session.name,
        class_name: session.className
    }

    const res = await saveStudentExamSurvey(fullPayload)
    if (res.success) {
        revalidatePath('/student/career')
    }
    return res
}

/**
 * 学生用: 自身の入試アンケートを削除する
 */
export async function deleteStudentExamSurveySelf(surveyId) {
    const session = await getStudentSessionLight()
    if (!session) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabase = getAdminSupabase()
    const { data } = await supabase
        .from('student_exam_surveys')
        .select('student_id')
        .eq('id', surveyId)
        .maybeSingle()

    if (!data || data.student_id !== session.studentId) {
        return { success: false, error: 'Unauthorized' }
    }

    const res = await deleteStudentExamSurvey(surveyId)
    if (res.success) {
        revalidatePath('/student/career')
    }
    return res
}
