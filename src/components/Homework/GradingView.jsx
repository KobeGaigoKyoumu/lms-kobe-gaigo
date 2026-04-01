'use client'

import { useState } from 'react'
import { gradeSubmission, returnSubmission, updateAssignmentDeadline, deleteAssignment } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Undo2, Image as ImageIcon, X, Edit2, Check, Trash2 } from 'lucide-react'
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

    const handleReturn = async () => {
        if (!confirm('この課題を差し戻しますか？得点はクリアされます。')) return
        setSaving(true)
        const result = await returnSubmission(submission.id, feedback)
        if (result.error) {
            alert(result.error)
        } else {
            setScore('')
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
                <div className={`${styles.statusBadge} ${submission.status === 'graded' ? styles.statusGraded : submission.status === 'returned' ? styles.statusReturned : styles.statusSubmitted}`}>
                    {submission.status === 'graded' ? '採点済み' : submission.status === 'returned' ? '差し戻し' : '未採点'}
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
                <div className={styles.buttonGroup}>
                    <button
                        onClick={handleReturn}
                        disabled={saving}
                        className={styles.returnButton}
                        title="差し戻す"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Undo2 size={20} />}
                        <span className={styles.buttonText}>差戻</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={styles.saveButton}
                        title="保存"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span className={styles.buttonText}>保存</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AssignmentGradingView({ assignment, submissions }) {
    const [selectedImage, setSelectedImage] = useState(null)
    const [isEditingDeadline, setIsEditingDeadline] = useState(false)
    const [editedDeadline, setEditedDeadline] = useState(assignment?.deadline ? assignment.deadline.slice(0, 16) : '')
    const [savingDeadline, setSavingDeadline] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const router = useRouter()

    if (!assignment) return <div>課題が見つかりません</div>

    const handleDeadlineSave = async () => {
        if (!editedDeadline) return
        setSavingDeadline(true)
        const tzDate = new Date(editedDeadline).toISOString()
        const result = await updateAssignmentDeadline(assignment.id, tzDate)
        if (result.error) {
            alert(result.error)
        } else {
            setIsEditingDeadline(false)
            router.refresh()
        }
        setSavingDeadline(false)
    }

    const handleDelete = async () => {
        if (!confirm('この課題を完全に削除してもよろしいですか？\n提出されたすべてのデータも削除されます。')) return
        
        setDeleting(true)
        const result = await deleteAssignment(assignment.id)
        if (result.error) {
            alert(result.error)
            setDeleting(false)
        } else {
            router.push(`/assignments/class/${encodeURIComponent(assignment.class_name)}`)
            router.refresh()
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', width: '100%' }}>
                    <h1 className={styles.title}>{assignment.title}</h1>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className={styles.deleteAssignmentButton}
                    >
                        {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        <span>課題を削除</span>
                    </button>
                </div>
                <div className={styles.meta}>
                    <span>クラス: {assignment.class_name}</span>
                    <span className={styles.deadlineWrapper}>
                        期限:
                        {isEditingDeadline ? (
                            <div className={styles.deadlineEditGroup}>
                                <input
                                    type="datetime-local"
                                    value={editedDeadline}
                                    onChange={(e) => setEditedDeadline(e.target.value)}
                                    className={styles.deadlineInput}
                                    disabled={savingDeadline}
                                />
                                <button
                                    onClick={handleDeadlineSave}
                                    disabled={savingDeadline}
                                    className={styles.iconButtonSave}
                                >
                                    {savingDeadline ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                </button>
                                <button
                                    onClick={() => setIsEditingDeadline(false)}
                                    disabled={savingDeadline}
                                    className={styles.iconButtonCancel}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className={styles.deadlineDisplayGroup}>
                                {new Date(assignment.deadline).toLocaleString('ja-JP')}
                                <button
                                    onClick={() => {
                                        setEditedDeadline(assignment.deadline ? assignment.deadline.slice(0, 16) : '')
                                        setIsEditingDeadline(true)
                                    }}
                                    className={styles.iconButtonEdit}
                                    title="期限を変更"
                                >
                                    <Edit2 size={12} />
                                </button>
                            </div>
                        )}
                    </span>
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
