'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function SubmissionForm({ assignmentId, submission, isPastDue, maxScore }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState(submission?.content || '')

    const handleSubmit = async (isDraft = false) => {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const submissionData = {
            assignment_id: assignmentId,
            student_id: user?.id,
            content,
            status: isDraft ? 'draft' : 'submitted',
            submitted_at: isDraft ? null : new Date().toISOString()
        }

        let error
        if (submission) {
            // 更新
            const { error: updateError } = await supabase
                .from('submissions')
                .update(submissionData)
                .eq('id', submission.id)
            error = updateError
        } else {
            // 新規作成
            const { error: insertError } = await supabase
                .from('submissions')
                .insert(submissionData)
            error = insertError
        }

        if (error) {
            alert('保存に失敗しました')
            console.error(error)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    // 採点済みの場合
    if (submission?.status === 'graded') {
        return (
            <div className={styles.gradedResult}>
                <div className={styles.scoreDisplay}>
                    <span className={styles.scoreLabel}>得点</span>
                    <span className={styles.scoreValue}>{submission.score}/{maxScore}点</span>
                </div>
                {submission.feedback && (
                    <div className={styles.feedback}>
                        <h4>フィードバック</h4>
                        <p>{submission.feedback}</p>
                    </div>
                )}
                <div className={styles.submittedContent}>
                    <h4>提出内容</h4>
                    <pre>{submission.content}</pre>
                </div>
            </div>
        )
    }

    // 提出済みで編集不可
    if (submission?.status === 'submitted') {
        return (
            <div className={styles.submittedState}>
                <div className={styles.submittedBadge}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 6L8 14l-4-4" />
                    </svg>
                    提出済み
                </div>
                <p className={styles.submittedTime}>
                    提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}
                </p>
                <div className={styles.submittedContent}>
                    <h4>提出内容</h4>
                    <pre>{submission.content}</pre>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.submissionForm}>
            {isPastDue && !submission && (
                <div className={styles.warning}>
                    締切を過ぎています。提出できない場合があります。
                </div>
            )}

            <div className={styles.formGroup}>
                <label>回答内容</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="ここに回答を入力してください..."
                    rows={10}
                    disabled={loading}
                />
            </div>

            <div className={styles.formActions}>
                <button
                    onClick={() => handleSubmit(true)}
                    disabled={loading || !content}
                    className={styles.draftBtn}
                >
                    下書き保存
                </button>
                <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading || !content}
                    className={styles.submitBtn}
                >
                    {loading ? '送信中...' : '提出する'}
                </button>
            </div>
        </div>
    )
}
