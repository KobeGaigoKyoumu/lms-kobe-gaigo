'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, BarChart2 } from 'lucide-react'
import styles from './StudyRecordsMatrix.module.css'

export default function StudyRecordsMatrix({ className }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({ students: [], records: [] })
    const [error, setError] = useState(null)

    const fetchRecords = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/teacher/class-study-records/${encodeURIComponent(className)}`)
            if (!res.ok) throw new Error('Failed to fetch study records')
            const json = await res.json()
            setData(json)
        } catch (err) {
            console.error(err)
            setError('学習記録の読み込みに失敗しました')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRecords()
    }, [className])

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <RefreshCw className="animate-spin text-blue-500" size={24} />
                <span>学習記録を読み込み中...</span>
            </div>
        )
    }

    if (error) {
        return <div className={styles.errorContainer}>{error}</div>
    }

    const { students = [], records = [] } = data

    // 学生ごとにデータを集計
    const studentStats = {}
    students.forEach(s => {
        studentStats[s.student_id_text] = {
            name: s.full_name,
            n5Vocab: { score: 0, total: 113 }, // プレースホルダー
            n5Quiz: { totalScore: 0, count: 0 },
            n5Exam: { maxPercent: null, count: 0 },
            jmHiragana: { score: null, total: null },
            jmKatakana: { score: null, total: null },
            jmExtra: { score: null, total: null },
            jmWords: { score: null, total: null }
        }
    })

    records.forEach(r => {
        const stats = studentStats[r.student_id_text]
        if (!stats) return

        if (r.app_type === 'n5_study_hub') {
            if (r.activity_type === 'flashcard') {
                stats.n5Vocab.score = Math.max(stats.n5Vocab.score, r.score || 0)
                if (r.total) stats.n5Vocab.total = r.total
            } else if (r.activity_type === 'quiz') {
                stats.n5Quiz.totalScore += r.score || 0
                stats.n5Quiz.count += 1
            } else if (r.activity_type === 'exam') {
                const percent = r.total ? Math.round((r.score / r.total) * 100) : 0
                stats.n5Exam.maxPercent = stats.n5Exam.maxPercent === null ? percent : Math.max(stats.n5Exam.maxPercent, percent)
                stats.n5Exam.count += 1
            }
        } else if (r.app_type === 'japanese_master') {
            const cat = r.category || ''
            const cardData = { score: r.score, total: r.total }
            
            if (cat.startsWith('hiragana')) {
                if (stats.jmHiragana.score === null || r.score > stats.jmHiragana.score) {
                    stats.jmHiragana = cardData
                }
            } else if (cat.startsWith('katakana')) {
                if (stats.jmKatakana.score === null || r.score > stats.jmKatakana.score) {
                    stats.jmKatakana = cardData
                }
            } else if (cat.startsWith('extra')) {
                if (stats.jmExtra.score === null || r.score > stats.jmExtra.score) {
                    stats.jmExtra = cardData
                }
            } else if (cat.startsWith('words')) {
                if (stats.jmWords.score === null || r.score > stats.jmWords.score) {
                    stats.jmWords = cardData
                }
            }
        }
    })

    const getScoreBadgeClass = (score, total) => {
        if (score === null || total === null || total === 0) return styles.badgeEmpty
        const percent = Math.round((score / total) * 100)
        if (percent === 100) return styles.badgePerfect
        if (percent >= 80) return styles.badgeExcellent
        if (percent >= 50) return styles.badgeGood
        return styles.badgeLow
    }

    const renderScore = (record) => {
        if (record.score === null || record.total === null) return <span className="text-gray-450 font-medium">-</span>
        const percent = Math.round((record.score / record.total) * 100)
        return (
            <div className={styles.scoreCell}>
                <span className={`${styles.badge} ${getScoreBadgeClass(record.score, record.total)}`}>
                    {percent}%
                </span>
                <span className={styles.rawScore}>{record.score}/{record.total}</span>
            </div>
        )
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.headerRow}>
                <h3 className={styles.sectionHeader}>
                    <BarChart2 size={18} />
                    学生別学習状況（プレイ記録）一覧
                </h3>
                <button onClick={fetchRecords} className={styles.refreshBtn}>
                    <RefreshCw size={14} />
                    最新情報に更新
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr className={styles.tableHeaderRow}>
                            <th rowSpan="2" className={styles.stickyCol}>学生名</th>
                            <th colSpan="3" className={styles.hubHeader}>📚 N5 Study Hub</th>
                            <th colSpan="4" className={styles.jmHeader}>🌸 Japanese Master</th>
                        </tr>
                        <tr className={styles.tableSubHeaderRow}>
                            <th className={styles.subTh}>単語暗記</th>
                            <th className={styles.subTh}>小テスト</th>
                            <th className={styles.subTh}>模擬試験</th>
                            <th className={styles.subTh}>ひらがな</th>
                            <th className={styles.subTh}>カタカナ</th>
                            <th className={styles.subTh}>濁音・拗音</th>
                            <th className={styles.subTh}>100単語</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan="8" className={styles.emptyText}>このクラスにアクティブな学生はいません。</td>
                            </tr>
                        ) : (
                            students.map(student => {
                                const stats = studentStats[student.student_id_text] || {}
                                
                                // N5 Quiz Average
                                const quizAvg = stats.n5Quiz.count > 0 
                                    ? `${Math.round(stats.n5Quiz.totalScore / stats.n5Quiz.count)}問 (${stats.n5Quiz.count}回)`
                                    : '-'

                                // N5 Exam Max
                                const examMax = stats.n5Exam.maxPercent !== null
                                    ? `${stats.n5Exam.maxPercent}% (${stats.n5Exam.count}回)`
                                    : '-'

                                return (
                                    <tr key={student.student_id_text} className={styles.tableRow}>
                                        <td className={`${styles.studentNameTh} ${styles.stickyCol}`}>
                                            <div className={styles.studentInfo}>
                                                <span className={styles.fullName}>{student.full_name}</span>
                                                <span className={styles.idText}>{student.student_id_text}</span>
                                            </div>
                                        </td>
                                        {/* N5 Study Hub */}
                                        <td className={styles.centerText}>
                                            {stats.n5Vocab.score > 0 ? (
                                                <div className={styles.scoreCell}>
                                                    <span className={`${styles.badge} ${getScoreBadgeClass(stats.n5Vocab.score, stats.n5Vocab.total)}`}>
                                                        {Math.round((stats.n5Vocab.score / stats.n5Vocab.total) * 100)}%
                                                    </span>
                                                    <span className={styles.rawScore}>{stats.n5Vocab.score}/{stats.n5Vocab.total}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className={`${styles.centerText} font-semibold text-slate-600`}>{quizAvg}</td>
                                        <td className={`${styles.centerText} font-semibold text-slate-600`}>{examMax}</td>
                                        
                                        {/* Japanese Master */}
                                        <td className={styles.centerText}>{renderScore(stats.jmHiragana)}</td>
                                        <td className={styles.centerText}>{renderScore(stats.jmKatakana)}</td>
                                        <td className={styles.centerText}>{renderScore(stats.jmExtra)}</td>
                                        <td className={styles.centerText}>{renderScore(stats.jmWords)}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
