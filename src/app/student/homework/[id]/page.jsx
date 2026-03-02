'use client'

import { useState, useEffect, use } from 'react'
import SubmissionForm from '@/components/Homework/SubmissionForm'
import { notFound } from 'next/navigation'
import { Calendar, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

export default function HomeworkPage({ params }) {
    const resolvedParams = use(params)
    const id = resolvedParams.id

    const [assignment, setAssignment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true
        async function fetchAssignment() {
            try {
                const res = await fetch(`/api/student/homework/${id}`)
                if (!res.ok) {
                    if (res.status === 404) {
                        if (isMounted) setError('Not Found')
                    } else {
                        throw new Error('Failed to fetch')
                    }
                    return
                }
                const data = await res.json()
                if (isMounted) setAssignment(data)
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
                        {new Date(assignment.deadline).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
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
