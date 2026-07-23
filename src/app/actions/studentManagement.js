'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'

const getSupabase = async () => {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
        // Fallback: Use server client with current user's session cookies
        const { createClient } = await import('@/lib/supabase/server')
        return await createClient()
    }
    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export const updateStudentStatus = async (studentId, newStatus) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('student_id_text', studentId)

    if (error) throw error

    revalidateTag('students', 'max')
    revalidateTag('jlpt-analytics', 'max')
    return { success: true }
}

export const updateStudentGrade = async (studentId, newAcademicYear) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .update({ academic_year: newAcademicYear })
        .eq('student_id_text', studentId)

    if (error) throw error

    revalidateTag('students', 'max')
    revalidateTag('jlpt-analytics', 'max')
    return { success: true }
}

export const deleteStudent = async (studentId) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id_text', studentId)

    if (error) throw error

    revalidateTag('students', 'max')
    revalidateTag('jlpt-analytics', 'max')
    return { success: true }
}

export const bulkDeleteStudents = async (studentIds) => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .delete()
        .in('student_id_text', studentIds)

    if (error) throw error

    revalidateTag('students', 'max')
    revalidateTag('jlpt-analytics', 'max')
    return { success: true }
}

export const resetAllGrades = async () => {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('students')
        .update({ academic_year: null })
        .neq('student_id_text', '______') // Dummy condition to match all

    if (error) throw error

    revalidateTag('students', 'max')
    revalidateTag('jlpt-analytics', 'max')
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
            let enrollYearTemp = 2000 + parseInt(idPrefix, 10)
            if (String(student.student_id_text).length >= 4) {
                const month = parseInt(String(student.student_id_text).substring(2, 4), 10)
                if (month >= 1 && month <= 3) {
                    enrollYearTemp -= 1
                }
            }
            enrollYear = enrollYearTemp
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
        let enrollYear = 2000 + parseInt(idPrefix, 10)
        if (String(s.student_id_text).length >= 4) {
            const month = parseInt(String(s.student_id_text).substring(2, 4), 10)
            if (month >= 1 && month <= 3) {
                enrollYear -= 1
            }
        }

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

    // ===== 課題データのアーカイブ化 =====
    // 学年リセットに伴い、現在アクティブな全課題を一括でアーカイブ（過去分）に移動する
    const { error: archiveError } = await supabase
        .from('homework_assignments')
        .update({ is_archived: true })
        .eq('is_archived', false)

    if (archiveError) {
        console.error('Failed to archive assignments:', archiveError)
        // 致命的なエラーにはしないがログに残す
    }

    revalidateTag('students', "max")
    revalidateTag('jlpt-analytics', "max")
    revalidateTag('homework-assignments', "max")
    revalidateTag('classes', "max")
    return {
        success: true,
        graduatedCount,
        updatedCount: newSecondYears.length,
        createdCount: newFirstYears.length,
        classesCreated,
        membersRegistered
    }
}

/**
 * 通常の学生Excelアップロード処理（Server Action）
 * @param {Array} uniqueStudents パース済みの学生データ配列
 */
export const processStudentExcelUpload = async (uniqueStudents) => {
    try {
        const supabase = await getSupabase()

        // 1. ユニークなクラス名を抽出
        const uniqueClasses = [...new Set(
            uniqueStudents
                .map(row => String(row.class_name || '').trim())
                .filter(cls => cls && /^\d+-\d+$/.test(cls))
        )]

        // 2. 既存クラスの確認 & 新規クラス作成
        let classesCreated = 0
        if (uniqueClasses.length > 0) {
            const { data: existingClasses } = await supabase
                .from('classes')
                .select('name')

            const existingClassNames = new Set((existingClasses || []).map(c => c.name))
            const newClasses = uniqueClasses.filter(cls => !existingClassNames.has(cls))

            if (newClasses.length > 0) {
                const classesToInsert = newClasses.map(className => {
                    const gradeLevel = className.startsWith('1-') ? '1年' : className.startsWith('2-') ? '2年' : null
                    return {
                        name: className,
                        grade_level: gradeLevel,
                        academic_year: new Date().getFullYear(),
                        description: `${className}クラス`
                    }
                })

                const { error: classError } = await supabase
                    .from('classes')
                    .insert(classesToInsert)

                if (!classError) {
                    classesCreated = newClasses.length
                } else {
                    console.error('Class creation error:', classError)
                }
            }
        }

        // 3. 既存の学生データを取得し、新規と更新用にマージ
        const { data: existingStudents, error: fetchError } = await supabase
            .from('students')
            .select('student_id_text, full_name, academic_year, status')

        if (fetchError) throw fetchError
        const existingMap = new Map((existingStudents || []).map(s => [s.student_id_text, s]))

        const studentsToUpsert = uniqueStudents.map(student => {
            const existing = existingMap.get(student.student_id_text)
            if (existing) {
                // 既存の学生はDB内の氏名、学年、ステータスを優先して保持し、他の拡張属性を更新する
                return {
                    ...student,
                    full_name: existing.full_name || student.full_name || '名称未設定',
                    academic_year: existing.academic_year || student.academic_year,
                    status: existing.status || student.status || 'active'
                }
            }
            // 新規の学生
            return {
                ...student,
                full_name: student.full_name || '名称未設定',
                status: student.status || 'active'
            }
        })

        // 4. Students Upsert
        const { error: upsertError } = await supabase
            .from('students')
            .upsert(studentsToUpsert, {
                onConflict: 'student_id_text'
            })

        if (upsertError) throw upsertError

        // 5. クラスメンバー自動登録
        const { data: allClasses } = await supabase
            .from('classes')
            .select('id, name')

        const classMap = new Map((allClasses || []).map(c => [c.name, c.id]))

        const studentIds = uniqueStudents
            .filter(s => s.class_name && classMap.has(s.class_name))
            .map(s => s.student_id_text)

        let membersRegistered = 0

        if (studentIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, student_id')
                .in('student_id', studentIds)

            if (profiles && profiles.length > 0) {
                const profileMap = new Map(profiles.map(p => [p.student_id, p.id]))

                const membersToInsert = uniqueStudents
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

        revalidateTag('students', 'max')
        revalidateTag('jlpt-analytics', 'max')
        revalidateTag('classes', 'max')

        return {
            success: true,
            count: uniqueStudents.length,
            classesCreated,
            membersRegistered
        }
    } catch (err) {
        console.error('processStudentExcelUpload error:', err)
        return {
            success: false,
            error: err.message || 'データ保存中にエラーが発生しました'
        }
    }
}
