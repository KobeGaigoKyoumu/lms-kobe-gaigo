'use client'

import styles from './SubmissionMatrix.module.css'

export default function SubmissionMatrix({ students, assignments, submissions }) {
    if (!students.length || !assignments.length) {
        return (
            <div className={styles.empty}>
                <p>提出データがありません</p>
            </div>
        )
    }

    // Build a lookup map: studentId -> assignmentId -> submission
    const subMap = new Map()
    submissions.forEach(sub => {
        const key = `${sub.student_id_text}_${sub.assignment_id}`
        subMap.set(key, sub)
    })

    // Calculate total score per student
    const studentTotals = students.map(student => {
        let total = 0
        assignments.forEach(assignment => {
            const sub = subMap.get(`${student.student_id_text}_${assignment.id}`)
            if (sub && (sub.status === 'submitted' || sub.status === 'graded')) {
                total += (sub.score || 0)
            }
        })
        return { studentId: student.student_id_text, total }
    })

    const totalMap = new Map(studentTotals.map(t => [t.studentId, t.total]))

    // Max possible total (number of assignments, each worth 1 point on submission)
    const maxTotal = assignments.length

    const getScoreColor = (score) => {
        if (score === null || score === undefined) return ''
        if (score >= 1) return styles.scoreSubmitted
        return styles.scoreNone
    }

    const getTotalColor = (total, max) => {
        if (max === 0) return ''
        const pct = (total / max) * 100
        if (pct >= 90) return styles.totalExcellent
        if (pct >= 70) return styles.totalGood
        if (pct >= 50) return styles.totalAverage
        if (pct > 0) return styles.totalLow
        return styles.totalNone
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    }

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.sectionTitle}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="16" height="16" rx="2" />
                    <path d="M2 7h16" />
                    <path d="M7 2v16" />
                </svg>
                提出状況
            </h2>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={`${styles.th} ${styles.stickyName}`}>Student name</th>
                            <th className={`${styles.th} ${styles.stickyTotal}`}>Total</th>
                            {assignments.map(a => (
                                <th key={a.id} className={styles.th}>
                                    <div className={styles.headerCell}>
                                        <span className={styles.headerTitle}>{a.title}</span>
                                        {a.deadline && (
                                            <span className={styles.headerDate}>
                                                {formatDate(a.deadline)}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => {
                            const total = totalMap.get(student.student_id_text) || 0
                            return (
                                <tr key={student.student_id_text} className={styles.row}>
                                    <td className={`${styles.td} ${styles.stickyName} ${styles.nameCell}`}>
                                        {student.full_name}
                                    </td>
                                    <td className={`${styles.td} ${styles.stickyTotal} ${styles.totalCell} ${getTotalColor(total, maxTotal)}`}>
                                        <span className={styles.totalValue}>{total}</span>
                                        <span className={styles.totalMax}>/{maxTotal}</span>
                                    </td>
                                    {assignments.map(assignment => {
                                        const sub = subMap.get(`${student.student_id_text}_${assignment.id}`)
                                        const hasSubmission = sub && (sub.status === 'submitted' || sub.status === 'graded')
                                        return (
                                            <td
                                                key={assignment.id}
                                                className={`${styles.td} ${styles.scoreCell} ${hasSubmission ? getScoreColor(sub.score) : styles.scoreNone}`}
                                            >
                                                {hasSubmission ? (
                                                    <span className={styles.scoreValue}>
                                                        {sub.score ?? '-'}
                                                    </span>
                                                ) : (
                                                    <span className={styles.noSubmission}>-</span>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
