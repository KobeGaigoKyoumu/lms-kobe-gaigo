'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, ChevronLeft } from 'lucide-react'
import SubmissionForm from '@/components/Homework/SubmissionForm'
import styles from './page.module.css'

export default function HomeworkClient({ assignment }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!assignment) return null

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
