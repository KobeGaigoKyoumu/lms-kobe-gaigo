'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'

export default function StudentList({ students }) {
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [jlptHistory, setJlptHistory] = useState([])
    const [loadingJlpt, setLoadingJlpt] = useState(false)

    // Fetch JLPT history when student is selected
    useEffect(() => {
        if (selectedStudent?.full_name || selectedStudent?.student_id_text) {
            fetchJlptHistory(selectedStudent.full_name, selectedStudent.student_id_text, selectedStudent.enrollment_date)
        } else {
            setJlptHistory([])
        }
    }, [selectedStudent?.full_name, selectedStudent?.student_id_text, selectedStudent?.enrollment_date])

    const fetchJlptHistory = async (name, studentId, enrollmentDate) => {
        setLoadingJlpt(true)
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleDateString('ja-JP')
    }

    const statusLabels = {
        active: '在籍中',
        graduated: '卒業',
        inactive: '休学'
    }

    return (
        <>
            {students?.length === 0 ? (
                <p className={styles.empty}>在籍者がいません</p>
            ) : (
                <div className={styles.memberList}>
                    {students?.map(student => (
                        <div key={student.student_id_text} className={styles.memberCard}>
                            <div className={styles.memberUser}>
                                <div className={styles.userAvatar}>
                                    {student.full_name?.[0] || '?'}
                                </div>
                                <div className={styles.memberInfo}>
                                    <p className={styles.userName}>{student.full_name}</p>
                                    <p className={styles.userMeta}>
                                        <span>学籍番号: {student.student_id_text}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(student)}
                                className={styles.detailBtn}
                            >
                                詳細
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 学生詳細モーダル */}
            {selectedStudent && (
                <div className={styles.modalOverlay} onClick={() => setSelectedStudent(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>学生詳細情報</h2>
                            <button onClick={() => setSelectedStudent(null)} className={styles.closeBtn}>×</button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* 基本情報 */}
                            <section className={styles.detailSection}>
                                <h3>基本情報</h3>
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>学籍番号</span>
                                        <span className={styles.detailValue}>{selectedStudent.student_id_text}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>氏名</span>
                                        <span className={styles.detailValue}>{selectedStudent.full_name || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>フリガナ</span>
                                        <span className={styles.detailValue}>{selectedStudent.name_kana || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>ローマ字</span>
                                        <span className={styles.detailValue}>{selectedStudent.name_romaji || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>メール</span>
                                        <span className={styles.detailValue}>{selectedStudent.email || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>クラス</span>
                                        <span className={styles.detailValue}>{selectedStudent.class_name || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>年度</span>
                                        <span className={styles.detailValue}>{selectedStudent.academic_year || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>ステータス</span>
                                        <span className={`${styles.detailValue} ${styles.statusBadge} ${styles[selectedStudent.status]}`}>
                                            {statusLabels[selectedStudent.status] || selectedStudent.status}
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
                                        <span className={styles.detailValue}>{selectedStudent.nationality || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>性別</span>
                                        <span className={styles.detailValue}>{selectedStudent.gender || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>生年月日</span>
                                        <span className={styles.detailValue}>{formatDate(selectedStudent.birth_date)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>電話番号</span>
                                        <span className={styles.detailValue}>{selectedStudent.phone || '-'}</span>
                                    </div>
                                    <div className={styles.detailItemFull}>
                                        <span className={styles.detailLabel}>住所</span>
                                        <span className={styles.detailValue}>{selectedStudent.address || '-'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* 在留情報 */}
                            <section className={styles.detailSection}>
                                <h3>在留情報</h3>
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>在留資格</span>
                                        <span className={styles.detailValue}>{selectedStudent.visa_status || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>入国日</span>
                                        <span className={styles.detailValue}>{formatDate(selectedStudent.entry_date)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>在留期限</span>
                                        <span className={styles.detailValue}>{formatDate(selectedStudent.visa_expiry)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>パスポート番号</span>
                                        <span className={styles.detailValue}>{selectedStudent.passport_number || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>在留カード番号</span>
                                        <span className={styles.detailValue}>{selectedStudent.residence_card_number || '-'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* 学籍情報 */}
                            <section className={styles.detailSection}>
                                <h3>学籍情報</h3>
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>コース</span>
                                        <span className={styles.detailValue}>{selectedStudent.course || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>入学期</span>
                                        <span className={styles.detailValue}>{selectedStudent.enrollment_period || '-'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>入学日</span>
                                        <span className={styles.detailValue}>{formatDate(selectedStudent.enrollment_date)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>卒業予定</span>
                                        <span className={styles.detailValue}>{formatDate(selectedStudent.graduation_date)}</span>
                                    </div>
                                </div>
                            </section>

                            {/* JLPT受験履歴 */}
                            <section className={styles.detailSection}>
                                <h3>JLPT受験履歴</h3>
                                {loadingJlpt ? (
                                    <p className={styles.loadingText}>読み込み中...</p>
                                ) : jlptHistory.length === 0 ? (
                                    <p className={styles.noData}>受験記録がありません</p>
                                ) : (
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
                                                        <td data-label="実施回">{record.session}</td>
                                                        <td data-label="レベル"><span className={styles.levelBadge}>{record.level}</span></td>
                                                        <td data-label="結果">
                                                            <span className={`${styles.resultBadge} ${record.result === '合格' ? styles.resultPass : styles.resultFail}`}>
                                                                {record.result}
                                                            </span>
                                                        </td>
                                                        <td data-label="スコア">{record.score || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

