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

    const getScoreColor = (score, status) => {
        if (status === 'returned') return styles.scoreReturned
        if (score === null || score === undefined) return ''
        if (status === 'submitted') return styles.scorePending
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
        
        // ヘッダーを少し太字にするなどの簡単な設定（無料版XLSXでは限られるが列幅調整を実施）
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                                        return (
                                            <td
                                                key={assignment.id}
                                                className={`${styles.td} ${styles.scoreCell} ${hasSubmission ? getScoreColor(sub?.score, sub?.status) : styles.scoreNone}`}
                                            >
                                                {hasSubmission ? (
                                                    <span className={styles.scoreValue}>
                                                        {sub.status === 'returned' ? '差戻' :
                                                            sub.status === 'submitted' ? '未' :
                                                                (sub.score ?? '-')}
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
