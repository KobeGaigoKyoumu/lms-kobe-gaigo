'use client'

import { useState } from 'react'
import { gradeSubmission } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Image as ImageIcon, X } from 'lucide-react'
import styles from './GradingView.module.css'

// This component handles the grading logic for a single student row
function SubmissionRow({ submission, student, onImageClick }) {
    const [score, setScore] = useState(submission.score ?? '')
    const [feedback, setFeedback] = useState(submission.feedback ?? '')
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setSaving(true)
        const result = await gradeSubmission(submission.id, score, feedback)
        if (result.error) {
            alert(result.error)
        } else {
            router.refresh()
        }
        setSaving(false)
    }

    const fileUrls = submission.file_urls || []

    const isImage = (filename) => {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
    }

    return (
        <div className={styles.submissionRow}>
            <div className={styles.rowHeader}>
                <div>
                    <span className={styles.studentName}>{student?.full_name || '不明な学生'}</span>
                    <span className={styles.studentClass}>({student?.class_name})</span>
                    <div className={styles.submittedAt}>提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}</div>
                </div>
                <div className={`${styles.statusBadge} ${submission.status === 'graded' ? styles.statusGraded : styles.statusSubmitted}`}>
                    {submission.status === 'graded' ? '採点済み' : '未採点'}
                </div>
            </div>

            {/* Comment */}
            {submission.comment && (
                <div className={styles.studentComment}>
                    {submission.comment}
                </div>
            )}

            {/* Files */}
            {fileUrls.length > 0 && (
                <div className={styles.files}>
                    {fileUrls.map((file, i) => (
                        <div key={i} className={styles.fileContainer}>
                            {isImage(file.name) ? (
                                <div
                                    className={styles.imageWrapper}
                                    onClick={() => onImageClick(file)}
                                >
                                    <img
                                        src={file.url}
                                        alt={file.name}
                                        className={styles.imageThumbnail}
                                    />
                                </div>
                            ) : null}
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.fileLink}
                                style={isImage(file.name) ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } : {}}
                            >
                                {!isImage(file.name) && <ImageIcon size={16} />}
                                <span className="truncate max-w-[200px]">{file.name}</span>
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {/* Grading Form */}
            <div className={styles.gradingForm}>
                <div className={styles.scoreInputGroup}>
                    <label className={styles.label}>点数</label>
                    <input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className={styles.input}
                        min="0" max="100"
                    />
                </div>
                <div className={styles.feedbackGroup}>
                    <label className={styles.label}>フィードバック</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className={styles.textarea}
                        placeholder="コメントを入力..."
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={styles.saveButton}
                    title="保存"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                </button>
            </div>
        </div>
    )
}

export default function AssignmentGradingView({ assignment, submissions }) {
    const [selectedImage, setSelectedImage] = useState(null)

    if (!assignment) return <div>課題が見つかりません</div>

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{assignment.title}</h1>
                <div className={styles.meta}>
                    <span>クラス: {assignment.class_name}</span>
                    <span>期限: {new Date(assignment.deadline).toLocaleString('ja-JP')}</span>
                </div>
                <div className={styles.description}>
                    {assignment.description || '説明なし'}
                </div>
            </div>

            <h2 className={styles.sectionTitle}>
                提出状況 ({submissions.length})
            </h2>

            {submissions.length === 0 ? (
                <div className={styles.empty}>
                    まだ提出はありません
                </div>
            ) : (
                <div className={styles.submissionRows}>
                    {submissions.map(sub => (
                        <SubmissionRow
                            key={sub.id}
                            submission={sub}
                            student={sub.student}
                            onImageClick={setSelectedImage}
                        />
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div className={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button
                            className={styles.closeButton}
                            onClick={() => setSelectedImage(null)}
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.name}
                            className={styles.modalImage}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
