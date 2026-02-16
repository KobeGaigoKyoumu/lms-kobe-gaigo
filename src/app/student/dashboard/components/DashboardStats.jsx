'use client'

import { useEffect, useState } from 'react'
import styles from './DashboardStats.module.css'

const useCounter = (end, duration = 1000) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime = null
        let animationFrameId

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime
            const progress = Math.min((currentTime - startTime) / duration, 1)

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4)

            setCount(Math.floor(ease * end))

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate)
            } else {
                setCount(end)
            }
        }

        animationFrameId = requestAnimationFrame(animate)

        return () => cancelAnimationFrame(animationFrameId)
    }, [end, duration])

    return count
}

export default function DashboardStats({ unsubmittedCount, completedCount, submissionPoints, dueThisWeekCount }) {
    // const animatedUnsubmitted = useCounter(unsubmittedCount)
    // const animatedCompleted = useCounter(completedCount)
    // const animatedPoints = useCounter(submissionPoints)
    // const animatedDue = useCounter(dueThisWeekCount)

    // Simplified for Mobile Stability
    const animatedUnsubmitted = unsubmittedCount
    const animatedCompleted = completedCount
    const animatedPoints = submissionPoints
    const animatedDue = dueThisWeekCount

    return (
        <div className={styles.statsGrid}>
            {/* Unsubmitted */}
            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                    </svg>
                </div>
                <div className={styles.statContent}>
                    <p className={styles.statLabel}>未提出課題</p>
                    <p className={styles.statValue}>{animatedUnsubmitted}</p>
                </div>
            </div>

            {/* Completed */}
            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                </div>
                <div className={styles.statContent}>
                    <p className={styles.statLabel}>完了課題</p>
                    <p className={styles.statValue}>{animatedCompleted}</p>
                </div>
            </div>

            {/* Submission Points */}
            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </div>
                <div className={styles.statContent}>
                    <p className={styles.statLabel}>課題提出点</p>
                    <p className={styles.statValue}>
                        {animatedPoints}
                        <span className={styles.statUnit}>pt</span>
                    </p>
                </div>
            </div>

            {/* Due this week */}
            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </div>
                <div className={styles.statContent}>
                    <p className={styles.statLabel}>今週の締切</p>
                    <p className={styles.statValue}>{animatedDue}</p>
                </div>
            </div>
        </div>
    )
}
