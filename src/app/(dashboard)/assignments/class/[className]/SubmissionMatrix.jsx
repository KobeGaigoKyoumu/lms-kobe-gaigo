'use client'

import styles from './SubmissionMatrix.module.css'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

export default function SubmissionMatrix({ students, assignments, submissions, className }) {
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
        let completeCount = 0
        assignments.forEach(assignment => {
            const sub = subMap.get(`${student.student_id_text}_${assignment.id}`)
            if (sub && sub.status === 'graded') {
                total += (sub.score || 0)
                completeCount++
            }
        })
        return { studentId: student.student_id_text, total, completeCount }
    })

    const totalMap = new Map(studentTotals.map(t => [t.studentId, t]))

    // Max possible total (number of assignments, each worth 1 point on submission)
    const maxTotal = assignments.length

    const AUTO_FEEDBACKS = [
        'いいです！', 'OKです！', 'すばらしいです！', 'とてもいいです！',
        'よく頑張っています！', 'カンペキ！', 'グレート！', 'パーフェクト！', 'ちゃんとやっていますね！'
    ]

    const isRecentSubmission = (sub) => {
        if (!sub || (!sub.submitted_at && !sub.updated_at)) return false
        const targetTime = new Date(sub.submitted_at || sub.updated_at).getTime()
        const nowTime = Date.now()
        const diffDays = (nowTime - targetTime) / (1000 * 60 * 60 * 24)
        return diffDays >= 0 && diffDays <= 7
    }

    const isResubmittedSubmission = (sub) => {
        if (!sub) return false
        if (sub.is_resubmitted) return true
        if (sub.status !== 'returned' && sub.feedback && sub.feedback.trim().length > 0 && !AUTO_FEEDBACKS.includes(sub.feedback.trim())) {
            return true
        }
        return false
    }

    const getScoreColor = (sub) => {
        if (!sub) return styles.scoreNone
        if (sub.status === 'returned') return styles.scoreReturned
        if (sub.status === 'submitted') return styles.scorePending

        const isRecent = isRecentSubmission(sub)
        const isResub = isResubmittedSubmission(sub)

        if (isRecent && isResub) return styles.scoreRecentAndResubmitted
        if (isResub) return styles.scoreResubmitted
        if (isRecent) return styles.scoreRecent

        if (sub.score >= 1 || sub.status === 'graded') return styles.scoreSubmitted
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

    const handleExport = () => {
        const header = ['学籍番号', '氏名', '提出完了数', '合計スコア']
        assignments.forEach(a => header.push(a.title))

        const rows = students.map(student => {
            const { total = 0, completeCount = 0 } = totalMap.get(student.student_id_text) || {}
            const row = [student.student_id_text, student.full_name, completeCount, total]

            assignments.forEach(a => {
                const sub = subMap.get(`${student.student_id_text}_${a.id}`)
                if (!sub) row.push('-')
                else if (sub.status === 'returned') row.push('差戻')
                else if (sub.status === 'submitted') row.push('未処理(提出済)')
                else row.push(sub.score ?? '-')
            })
            return row
        })

        const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
        
        const wscols = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }]
        assignments.forEach(() => wscols.push({ wch: 20 }))
        ws['!cols'] = wscols

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '提出状況')
        const safeClassName = className ? className.replace(/[^a-zA-Z0-9_\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf-]/g, '') : 'クラス'
        XLSX.writeFile(wb, `${safeClassName}_提出状況_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    return (
        <div className={styles.wrapper}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="16" height="16" rx="2" />
                        <path d="M2 7h16" />
                        <path d="M7 2v16" />
                    </svg>
                    提出状況
                </h2>
                <button onClick={handleExport} className={styles.exportBtn}>
                    <Download size={16} />
                    Excelエクスポート
                </button>
            </div>

            {/* カラーラベル（凡例） */}
            <div className={styles.legendContainer}>
                <span className={styles.legendTitle}>【提出状態ラベル】</span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendBadge} ${styles.legendSubmitted}`}>1</span>
                    通常提出
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendBadge} ${styles.legendRecent}`}>1</span>
                    直近1週間以内の提出
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendBadge} ${styles.legendResubmitted}`}>1</span>
                    差戻し後の再提出
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendBadge} ${styles.legendRecentAndResubmitted}`}>1</span>
                    直近1週間＆再提出
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendBadge} ${styles.legendReturned}`}>差戻</span>
                    差戻し中
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendBadge} ${styles.legendPending}`}>未</span>
                    未処理
                </span>
            </div>

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
                            const { total = 0 } = totalMap.get(student.student_id_text) || {}
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
                                        const hasSubmission = sub && (sub.status === 'submitted' || sub.status === 'graded' || sub.status === 'returned')
                                        const isRecent = hasSubmission && isRecentSubmission(sub)
                                        const isResub = hasSubmission && isResubmittedSubmission(sub)

                                        return (
                                            <td
                                                key={assignment.id}
                                                className={`${styles.td} ${styles.scoreCell} ${hasSubmission ? getScoreColor(sub) : styles.scoreNone}`}
                                                title={
                                                    hasSubmission
                                                        ? `${student.full_name} - ${assignment.title}\nステータス: ${sub.status}\n提出日時: ${sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('ja-JP') : '不明'}${isResub ? '\n(差戻し後の再提出)' : ''}${isRecent ? '\n(直近1週間以内)' : ''}`
                                                        : undefined
                                                }
                                            >
                                                {hasSubmission ? (
                                                    <span className={styles.scoreValue}>
                                                        {sub.status === 'returned' ? '差戻' :
                                                            sub.status === 'submitted' ? '未' :
                                                                (sub.score ?? 1)}
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
