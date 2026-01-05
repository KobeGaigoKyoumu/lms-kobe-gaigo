'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function GradeForm({ submission, maxScore }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [score, setScore] = useState(submission.score ?? '')
    const [feedback, setFeedback] = useState(submission.feedback || '')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()

        const { error } = await supabase
            .from('submissions')
            .update({
                score: parseInt(score),
                feedback,
                status: 'graded',
                graded_at: new Date().toISOString()
            })
            .eq('id', submission.id)

        if (error) {
            alert('採点の保存に失敗しました')
            console.error(error)
        } else {
            router.push(`/assignments/${submission.assignment_id}`)
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className={styles.gradeForm}>
            <div className={styles.scoreInput}>
                <label>得点</label>
                <div className={styles.scoreField}>
                    <input
                        type="number"
                        min="0"
                        max={maxScore}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        required
                    />
                    <span>/ {maxScore}点</span>
                </div>
            </div>

            <div className={styles.feedbackInput}>
                <label>フィードバック</label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="学生へのコメントを入力..."
                    rows={5}
                />
            </div>

            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className={styles.cancelBtn}
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={loading || score === ''}
                    className={styles.saveBtn}
                >
                    {loading ? '保存中...' : '採点を保存'}
                </button>
            </div>
        </form>
    )
}
