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

/**
 * 学年リセット処理（Excelデータベース）
 * 1. 旧2年生を非在籍者（graduated）にする
 * 2. 新2年生（25xx）のデータを更新
 * 3. 新1年生（26xx）のデータを新規登録
 * @param {Array} studentsData パース済みの学生データ配列
 */
export const performGradeReset = async (studentsData) => {
    const supabase = await getSupabase()

    // 学年リセットは「新年度」への移行処理であるため、
    // 今が1〜3月であっても対象となるベース年度は「今年(currentYear)」と同じになる
    const today = new Date()
    const currentYear = today.getFullYear()
    const targetAcademicYear = currentYear

    // ===== Step 1: 旧2年生（およびそれ以前の過年度生）の非在籍者化 =====
    // 新年度(targetAcademicYear)から見て、2年以上前に入学した学生
    const oldSecondYearAY = targetAcademicYear - 2

    // `academic_year` カラムが null の場合（学籍番号フォールバック）も考慮するため、全 active 学生を取得して判定する
    const { data: allActiveStudents, error: fetchError } = await supabase
        .from('students')
        .select('student_id_text, academic_year')
        .eq('status', 'active')

    if (fetchError) throw fetchError

    const studentsToGraduate = (allActiveStudents || []).filter(student => {
        let enrollYear = student.academic_year
        if (!enrollYear) {
            // academic_yearがnullの場合は学籍番号から類推 (parseStudentIdと同じロジック)
            const idPrefix = String(student.student_id_text).substring(0, 2)
            enrollYear = 2000 + parseInt(idPrefix, 10)
        }
        return enrollYear <= oldSecondYearAY
    }).map(s => s.student_id_text)

    let graduatedCount = 0
    if (studentsToGraduate.length > 0) {
        const { error: gradError } = await supabase
            .from('students')
            .update({ status: 'graduated' })
            .in('student_id_text', studentsToGraduate)

        if (gradError) throw gradError
        graduatedCount = studentsToGraduate.length
    }

    // ===== Step 2 & 3: Excelデータのupsert =====
    // 新2年生（25xx）と新1年生（26xx）を分類してacademic_yearを設定
    const processedStudents = studentsData.map(s => {
        const idPrefix = String(s.student_id_text).substring(0, 2)
        const enrollYear = 2000 + parseInt(idPrefix, 10)

        // Excelに旧2年生以下のデータが混ざっていた場合、強制的に 'graduated' にする
        const studentStatus = (enrollYear <= oldSecondYearAY) ? 'graduated' : (s.status || 'active')

        return {
            ...s,
            academic_year: enrollYear,
            status: studentStatus
        }
    })

    // Upsert（学籍番号で重複時は更新）
    const { error: upsertError } = await supabase
        .from('students')
        .upsert(processedStudents, {
            onConflict: 'student_id_text'
        })

    if (upsertError) throw upsertError

    // 新2年生と新1年生の件数を集計
    const newSecondYears = processedStudents.filter(s =>
        String(s.student_id_text).substring(0, 2) === String(targetAcademicYear - 1).substring(2)
    )
    const newFirstYears = processedStudents.filter(s =>
        String(s.student_id_text).substring(0, 2) === String(targetAcademicYear).substring(2)
    )

    // ===== クラス関連処理 =====
    // ユニークなクラス名を抽出
    const uniqueClasses = [...new Set(
        processedStudents
            .map(s => String(s.class_name || '').trim())
            .filter(cls => cls && /^\d+-\d+$/.test(cls))
    )]

    // 既存のクラスを取得
    const { data: existingClasses } = await supabase
        .from('classes')
        .select('id, name')

    const existingClassMap = new Map((existingClasses || []).map(c => [c.name, c.id]))

    // 新規クラスを作成
    const newClassNames = uniqueClasses.filter(cls => !existingClassMap.has(cls))
    let classesCreated = 0

    if (newClassNames.length > 0) {
        const classesToInsert = newClassNames.map(className => {
            const gradeLevel = className.startsWith('1-') ? '1年' : className.startsWith('2-') ? '2年' : null
            return {
                name: className,
                grade_level: gradeLevel,
                academic_year: currentYear,
                description: `${className}クラス`
            }
        })

        const { error: classError } = await supabase
            .from('classes')
            .insert(classesToInsert)

        if (!classError) {
            classesCreated = newClassNames.length
        }
    }

    // クラスメンバー自動登録
    const { data: allClasses } = await supabase
        .from('classes')
        .select('id, name')

    const classMap = new Map((allClasses || []).map(c => [c.name, c.id]))

    const studentIdsWithClass = processedStudents
        .filter(s => s.class_name && classMap.has(s.class_name))
        .map(s => s.student_id_text)

    let membersRegistered = 0

    if (studentIdsWithClass.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, student_id')
            .in('student_id', studentIdsWithClass)

        if (profiles && profiles.length > 0) {
            const profileMap = new Map(profiles.map(p => [p.student_id, p.id]))

            const membersToInsert = processedStudents
                .filter(s => s.class_name && profileMap.has(s.student_id_text))
                .map(s => ({
                    class_id: classMap.get(s.class_name),
                    user_id: profileMap.get(s.student_id_text)
                }))
                .filter(m => m.class_id && m.user_id)

            if (membersToInsert.length > 0) {
                const { error: memberError } = await supabase
                    .from('class_members')
                    .upsert(membersToInsert, { onConflict: 'class_id,user_id' })

                if (!memberError) {
                    membersRegistered = membersToInsert.length
                }
            }
        }
    }

    revalidateTag('students')
    return {
        success: true,
        graduatedCount,
        updatedCount: newSecondYears.length,
        createdCount: newFirstYears.length,
        classesCreated,
        membersRegistered
    }
}
