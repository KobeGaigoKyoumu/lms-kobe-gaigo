'use client'

import { useState, useEffect, use } from 'react'
import SubmissionForm from '@/components/Homework/SubmissionForm'
import { notFound } from 'next/navigation'
import { Calendar, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { getStudentSession } from '@/app/actions/studentAuth'

export default function HomeworkPage({ params }) {
    const resolvedParams = use(params)
    const id = resolvedParams.id

    const [mounted, setMounted] = useState(false)
    const [assignment, setAssignment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        let isMounted = true
        async function fetchAssignment() {
            try {
                const supabase = createClient()
                
                // Get session via server action
                const session = await getStudentSession()
                if (!session) throw new Error('Unauthorized')

                // 1. Fetch assignment first
                const { data: assignmentData, error: assignmentError } = await supabase
                    .from('homework_assignments')
                    .select('*')
                    .eq('id', id)
                    .single()
                
                if (assignmentError || !assignmentData) {
                    if (isMounted) setError('Not Found')
                    return
                }

                // 2. Fetch submission separately if assignment exists
                const { data: submissionData } = await supabase
                    .from('homework_submissions')
                    .select('*')
                    .eq('assignment_id', id)
                    .eq('student_id_text', session.studentId)
                    .maybeSingle()

                if (isMounted) {
                    setAssignment({
                        ...assignmentData,
                        submission: submissionData || null
                    })
                }
            } catch (err) {
                console.error(err)
                if (isMounted) setError('エラーが発生しました')
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchAssignment()
        return () => { isMounted = false }
    }, [id])

    if (error === 'Not Found') {
        notFound()
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Link href="/student/dashboard" className={styles.backLink}>
                    <ChevronLeft size={16} />
                    一覧に戻る
                </Link>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    if (loading || !assignment) {
        return (
            <div className={styles.container}>
                <Link href="/student/dashboard" className={styles.backLink}>
                    <ChevronLeft size={16} />
                    一覧に戻る
                </Link>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Link href="/student/dashboard" className={styles.backLink}>
                <ChevronLeft size={16} />
                一覧に戻る
            </Link>

            <div className={styles.card}>
                <h1 className={styles.title}>{assignment.title}</h1>

                <div className={styles.meta}>
                    <Calendar size={16} className={styles.metaIcon} />
                    <span className={styles.metaLabel}>提出期限:</span>
                    <span>
                        {mounted && assignment.deadline && !isNaN(new Date(assignment.deadline).getTime()) ? (
                            new Date(assignment.deadline).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                        ) : ''}
                    </span>
                </div>

                <div className={styles.description}>
                    {assignment.description || '説明はありません。'}
                </div>
            </div>

            <h2 className={styles.sectionTitle}>提出</h2>
            <SubmissionForm
                assignmentId={assignment.id}
                initialComment={assignment.submission?.comment}
                initialFiles={assignment.submission?.file_urls}
            />

            {assignment.submission?.feedback && (
                <div className={styles.feedback}>
                    <h3 className={styles.feedbackTitle}>先生からのフィードバック</h3>
                    <p className={styles.feedbackContent}>{assignment.submission.feedback}</p>
                    {assignment.submission.score !== null && (
                        <div className={styles.score}>
                            評価: {assignment.submission.score}点
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
