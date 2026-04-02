'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import HomeworkListClient from './HomeworkListClient'
import styles from './page.module.css'

export default function HomeworkClientWrapper({ studentId, className }) {
    const [loading, setLoading] = useState(true)
    const [assignmentsData, setAssignmentsData] = useState({ active: [], archived: [] })
    const [error, setError] = useState(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId || !className) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                
                // 1. Get assignments for the class currently
                const { data: activeAssignments, error: activeError } = await supabase
                    .from('homework_assignments')
                    .select('id, title, description, deadline, class_name, created_at')
                    .eq('class_name', className)
                    .eq('is_archived', false)
                    .order('deadline', { ascending: true })
                    .limit(100)

                if (activeError) throw activeError

                // 2. Get student's all submissions
                const { data: submissions, error: submissionError } = await supabase
                    .from('homework_submissions')
                    .select('id, assignment_id, status, submitted_at, score')
                    .eq('student_id_text', studentId)

                if (submissionError) throw submissionError

                const submissionMap = new Map()
                ;(submissions || []).forEach(s => submissionMap.set(s.assignment_id, s))

                // 3. To get the details of archived assignments or assignments from previous classes
                const activeAssignmentIds = new Set((activeAssignments || []).map(a => a.id))
                const submittedAssignmentIds = (submissions || []).map(s => s.assignment_id)
                const pastIdsToFetch = submittedAssignmentIds.filter(id => !activeAssignmentIds.has(id))

                let archivedAssignments = []
                if (pastIdsToFetch.length > 0) {
                    const { data: pastAssignmentsData } = await supabase
                        .from('homework_assignments')
                        .select('id, title, description, deadline, class_name, created_at')
                        .in('id', pastIdsToFetch)
                        .order('created_at', { ascending: false })
                    
                    archivedAssignments = pastAssignmentsData || []
                }

                const active = (activeAssignments || []).map(a => ({
                    ...a,
                    submission: submissionMap.get(a.id) || null
                }))

                const archived = archivedAssignments.map(a => ({
                    ...a,
                    submission: submissionMap.get(a.id) || null
                }))

                setAssignmentsData({ active, archived })
            } catch (err) {
                console.error('Failed to fetch homework data:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [supabase, studentId, className])

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>課題一覧</h1>
                    <p className={styles.subtitle}>読み込み中...</p>
                </div>
                <div className={styles.loadingState}>
                    <p>課題を読み込んでいます...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    データの取得に失敗しました: {error}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>課題一覧</h1>
                <p className={styles.subtitle}>提出期限を確認して、計画的に進めましょう</p>
            </div>

            <HomeworkListClient assignmentsData={assignmentsData} />
        </div>
    )
}
