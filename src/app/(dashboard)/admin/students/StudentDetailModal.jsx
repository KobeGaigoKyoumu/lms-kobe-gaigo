'use client'

import styles from './page.module.css'
import { parseStudentId } from '@/lib/utils/studentId'

export default function StudentDetailModal({ student, onClose }) {
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
        inactive: '休学'
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
                </div>
            </div>
        </div>
    )
}
