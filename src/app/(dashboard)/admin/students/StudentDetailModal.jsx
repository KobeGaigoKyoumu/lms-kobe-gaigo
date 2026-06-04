'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { parseStudentId } from '@/lib/utils/studentId'
import { getStudentDetail } from '@/app/actions/studentData'
import { getStudentExamSchedules, deleteStudentExamSchedule } from '@/app/actions/career'


export default function StudentDetailModal({ student: initialStudent, onClose }) {
    const [student, setStudent] = useState(initialStudent)
    const [loadingDetail, setLoadingDetail] = useState(true)
    const [jlptHistory, setJlptHistory] = useState([])
    const [loadingJlpt, setLoadingJlpt] = useState(true)
    const [schedules, setSchedules] = useState([])
    const [loadingSchedules, setLoadingSchedules] = useState(true)
    const [showSchedulesModal, setShowSchedulesModal] = useState(false)


    // Fetch Full Detail
    useEffect(() => {
        if (initialStudent?.student_id_text) {
            const loadDetail = async () => {
                try {
                    const fullData = await getStudentDetail(initialStudent.student_id_text)
                    if (fullData) {
                        setStudent(prev => ({ ...prev, ...fullData }))
                    }
                } catch (err) {
                    console.error('Error fetching student detail:', err)
                } finally {
                    setLoadingDetail(false)
                }
            }
            const loadSchedules = async () => {
                try {
                    const data = await getStudentExamSchedules(initialStudent.student_id_text)
                    setSchedules(data || [])
                } catch (err) {
                    console.error('Error fetching student exam schedules:', err)
                } finally {
                    setLoadingSchedules(false)
                }
            }
            loadDetail()
            loadSchedules()
        }
    }, [initialStudent])


    useEffect(() => {
        if (student?.full_name || student?.student_id_text) {
            fetchJlptHistory(student.full_name, student.student_id_text, student.enrollment_date)
        }
    }, [student?.full_name, student?.student_id_text, student?.enrollment_date])

    const fetchJlptHistory = async (name, studentId, enrollmentDate) => {
        try {
            // Build URL with available parameters (studentId takes priority on server)
            let url = `/api/jlpt/student?`
            const params = []
            if (studentId) {
                params.push(`studentId=${encodeURIComponent(studentId)}`)
            }
            if (name) {
                params.push(`name=${encodeURIComponent(name)}`)
            }
            if (enrollmentDate) {
                params.push(`enrollmentDate=${encodeURIComponent(enrollmentDate)}`)
            }
            url += params.join('&')

            const res = await fetch(url)
            const data = await res.json()
            setJlptHistory(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching JLPT history:', error)
            setJlptHistory([])
        } finally {
            setLoadingJlpt(false)
        }
    }

    if (!student) return null

    // 学籍番号から学年・クラス情報を計算
    const studentInfo = parseStudentId(student.student_id_text)

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleDateString('ja-JP')
    }

    const statusLabels = {
        active: '在籍中',
        graduated: '卒業',
        inactive: '休学',
        completed: '修了',
        withdrawn: '退学'
    }

    const getResultBadgeClass = (result) => {
        if (result === '合格') return styles.resultPass
        if (result === '不合格') return styles.resultFail
        return ''
    }

    const handleDeleteSchedule = async (id) => {
        if (!confirm('この入試予定を削除しますか？')) return
        try {
            const res = await deleteStudentExamSchedule(id)
            if (res.success) {
                setSchedules(prev => prev.filter(s => s.id !== id))
            } else {
                alert(`削除に失敗しました: ${res.error || '不明なエラー'}`)
            }
        } catch (err) {
            console.error('Delete schedule error:', err)
            alert('削除中にエラーが発生しました')
        }
    }


    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>学生詳細情報</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <div className={styles.modalBody}>
                    {/* 基本情報 */}
                    <section className={styles.detailSection}>
                        <h3>基本情報</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>学籍番号</span>
                                <span className={styles.detailValue}>{student.student_id_text}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>氏名</span>
                                <span className={styles.detailValue}>{student.full_name || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>フリガナ</span>
                                <span className={styles.detailValue}>{student.name_kana || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>ローマ字</span>
                                <span className={styles.detailValue}>{student.name_romaji || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>学年</span>
                                <span className={styles.detailValue}>{studentInfo.gradeName || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>クラス</span>
                                <span className={styles.detailValue}>{student.class_name || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>入学年度</span>
                                <span className={styles.detailValue}>{studentInfo.enrollmentYear || student.academic_year || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>入学時期</span>
                                <span className={styles.detailValue}>{studentInfo.enrollmentPeriod || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>メール</span>
                                <span className={styles.detailValue}>{student.email || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>ステータス</span>
                                <span className={`${styles.detailValue} ${styles.statusBadge} ${styles[student.status]}`}>
                                    {statusLabels[student.status] || student.status}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* 個人情報 */}
                    <section className={styles.detailSection}>
                        <h3>個人情報</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>国籍</span>
                                <span className={styles.detailValue}>{student.nationality || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>性別</span>
                                <span className={styles.detailValue}>{student.gender || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>生年月日</span>
                                <span className={styles.detailValue}>{formatDate(student.birth_date)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>電話番号</span>
                                <span className={styles.detailValue}>{student.phone || '-'}</span>
                            </div>
                            <div className={styles.detailItemFull}>
                                <span className={styles.detailLabel}>住所</span>
                                <span className={styles.detailValue}>{student.address || '-'}</span>
                            </div>
                        </div>
                    </section>

                    {/* 在留情報 */}
                    <section className={styles.detailSection}>
                        <h3>在留情報</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>在留資格</span>
                                <span className={styles.detailValue}>{student.visa_status || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>入国日</span>
                                <span className={styles.detailValue}>{formatDate(student.entry_date)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>在留期限</span>
                                <span className={styles.detailValue}>{formatDate(student.visa_expiry)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>パスポート番号</span>
                                <span className={styles.detailValue}>{student.passport_number || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>在留カード番号</span>
                                <span className={styles.detailValue}>{student.residence_card_number || '-'}</span>
                            </div>
                        </div>
                    </section>

                    {/* 学籍情報 */}
                    <section className={styles.detailSection}>
                        <h3>学籍情報</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>コース</span>
                                <span className={styles.detailValue}>{student.course || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>入学期</span>
                                <span className={styles.detailValue}>{student.enrollment_period || '-'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>入学日</span>
                                <span className={styles.detailValue}>{formatDate(student.enrollment_date)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>卒業予定</span>
                                <span className={styles.detailValue}>{formatDate(student.graduation_date)}</span>
                            </div>
                        </div>
                    </section>

                    {/* 進学先情報 */}
                    <section className={styles.detailSection}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>進学先情報</h3>
                            <button
                                onClick={() => setShowSchedulesModal(true)}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#374151'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                入試予定の確認
                            </button>
                        </div>
                        <div className={styles.destinationName}>
                            {student.destination || '-'}
                        </div>
                    </section>


                    {/* JLPT受験履歴 */}
                    <section className={styles.detailSection}>
                        <h3>JLPT受験履歴</h3>
                        {loadingJlpt ? (
                            <p className={styles.loadingText}>読み込み中...</p>
                        ) : jlptHistory.length > 0 ? (
                            <div className={styles.jlptTable}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>実施回</th>
                                            <th>レベル</th>
                                            <th>結果</th>
                                            <th>スコア</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jlptHistory.map((record, idx) => (
                                            <tr key={idx}>
                                                <td>{record.session}</td>
                                                <td><span className={styles.levelBadge}>{record.level}</span></td>
                                                <td>
                                                    <span className={`${styles.resultBadge} ${getResultBadgeClass(record.result)}`}>
                                                        {record.result}
                                                    </span>
                                                </td>
                                                <td>{record.score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className={styles.noData}>JLPT受験記録がありません</p>
                        )}
                    </section>
                </div>
            </div>
            {/* 入試予定の確認モーダル */}
            {showSchedulesModal && (
                <div className={styles.modalOverlay} onClick={() => setShowSchedulesModal(false)}>
                    <div className={styles.modalContent} style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>入試予定の確認 ({student.full_name || student.student_id_text} さん)</h2>
                            <button onClick={() => setShowSchedulesModal(false)} className={styles.closeBtn}>×</button>
                        </div>
                        <div className={styles.modalBody} style={{ padding: '20px' }}>
                            {loadingSchedules ? (
                                <p>読み込み中...</p>
                            ) : schedules.length > 0 ? (
                                <div className={styles.jlptTable} style={{ marginTop: '0' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>受験予定校 (学部・学科・コース)</th>
                                                <th>出願期間</th>
                                                <th>入試日</th>
                                                <th>合否発表日</th>
                                                <th>合否</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedules.map((sched) => (
                                                <tr key={sched.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>{sched.school_name}</div>
                                                        {sched.department_name && (
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{sched.department_name}</div>
                                                        )}
                                                    </td>
                                                    <td>{sched.application_period || '-'}</td>
                                                    <td>{sched.exam_date || '-'}</td>
                                                    <td>{sched.results_date || '-'}</td>
                                                    <td>
                                                        <span className={`${styles.statusBadge}`} style={{
                                                            backgroundColor: sched.status === '合格' ? '#f0fdf4' : sched.status === '不合格' ? '#fef2f2' : '#fef9c3',
                                                            color: sched.status === '合格' ? '#166534' : sched.status === '不合格' ? '#991b1b' : '#854d0e',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            {sched.status || '結果待ち'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleDeleteSchedule(sched.id)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                backgroundColor: '#fef2f2',
                                                                color: '#991b1b',
                                                                border: '1px solid #fee2e2',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            削除
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className={styles.noData}>登録された入試予定はありません。</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

