'use server'

import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from './studentAuth'
import { getUnreadCount } from './messageActions'

/**
 * アプリ全体の「新着」状態をまとめて取得する
 * @returns {Promise<{ hasNewAnnouncement: boolean, unsubmittedAssignmentCount: number, unreadMessageCount: number }>}
 */
export async function getAppNewStatus() {
    try {
        const session = await getStudentSession()
        if (!session) return { hasNewAnnouncement: false, unsubmittedAssignmentCount: 0, unreadMessageCount: 0 }

        const supabase = await createClient()

        // 1. 未読メッセージ数 (既存ロジック流用)
        const unreadMessageCount = await getUnreadCount()

        // 2. 課題 (未提出の件数)
        // Optimize: Fetch only necessary IDs
        const { data: assignments } = await supabase
            .from('homework_assignments')
            .select('id')
            .eq('class_name', session.className)

        const assignmentIds = assignments?.map(a => a.id) || []
        let unsubmittedAssignmentCount = 0

        if (assignmentIds.length > 0) {
            const { data: submissions } = await supabase
                .from('homework_submissions')
                .select('assignment_id')
                .eq('student_id_text', session.studentId)
                .in('assignment_id', assignmentIds)

            const submittedIds = new Set(submissions?.map(s => s.assignment_id) || [])
            unsubmittedAssignmentCount = assignmentIds.filter(id => !submittedIds.has(id)).length
        }

        // 3. お知らせ (直近3日以内の新着があるか)
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

        const { data: announcements } = await supabase
            .from('announcements')
            .select('target_type, target_grade, target_class, target_student_ids')
            .gte('created_at', threeDaysAgo.toISOString())
            .order('created_at', { ascending: false })

        let hasNewAnnouncement = false
        if (announcements && announcements.length > 0) {
            // Use academic_year from session if available, otherwise fallback to fetch (for legacy sessions)
            let academicYear = session.academicYear

            if (!academicYear) {
                const { data: studentInfo } = await supabase
                    .from('students')
                    .select('academic_year')
                    .eq('student_id_text', session.studentId)
                    .single()
                academicYear = studentInfo?.academic_year
            }

            if (academicYear) {
                hasNewAnnouncement = announcements.some(ann => {
                    if (!ann.target_type || ann.target_type === 'all') return true

                    if (ann.target_type === 'grade') {
                        const currentYear = new Date().getFullYear()
                        const isBeforeApril = new Date().getMonth() < 3
                        const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
                        const studentGrade = academicYearBase - academicYear + 1
                        return String(studentGrade) === ann.target_grade
                    }
                    if (ann.target_type === 'class') {
                        return ann.target_class === session.className
                    }
                    if (ann.target_type === 'individual') {
                        return ann.target_student_ids?.includes(session.studentId)
                    }
                    return false
                })
            }
        }

        return {
            hasNewAnnouncement,
            unsubmittedAssignmentCount,
            unreadMessageCount
        }
    } catch (error) {
        console.error('getAppNewStatus error:', error)
        return { hasNewAnnouncement: false, unsubmittedAssignmentCount: 0, unreadMessageCount: 0 }
    }
}
