'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function EnrollmentManager({ courseId, userId, isEnrolled: initialIsEnrolled }) {
    const router = useRouter()
    const [isEnrolled, setIsEnrolled] = useState(initialIsEnrolled)
    const [loading, setLoading] = useState(false)

    const handleEnroll = async () => {
        setLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: courseId,
                user_id: userId
            })

        if (error) {
            console.error('Enrollment error:', error)
            setLoading(false)
            return
        }

        setIsEnrolled(true)
        setLoading(false)
        router.refresh()
    }

    const handleUnenroll = async () => {
        setLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('course_enrollments')
            .delete()
            .eq('course_id', courseId)
            .eq('user_id', userId)

        if (error) {
            console.error('Unenrollment error:', error)
            setLoading(false)
            return
        }

        setIsEnrolled(false)
        setLoading(false)
        router.refresh()
    }

    return (
        <div className={styles.enrollmentAction}>
            {isEnrolled ? (
                <>
                    <div className={styles.enrolledBadge}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13.5 4.5L6 12L2.5 8.5" />
                        </svg>
                        登録済み
                    </div>
                    <button
                        onClick={handleUnenroll}
                        disabled={loading}
                        className={styles.unenrollBtn}
                    >
                        {loading ? '処理中...' : '登録解除'}
                    </button>
                </>
            ) : (
                <button
                    onClick={handleEnroll}
                    disabled={loading}
                    className={styles.enrollBtn}
                >
                    {loading ? '処理中...' : 'このコースに登録する'}
                </button>
            )}
        </div>
    )
}
