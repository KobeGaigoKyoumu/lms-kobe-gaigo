'use client'

import { useState } from 'react'
import { gradeSubmission, returnSubmission, updateAssignmentDeadline, deleteAssignment, updateAssignment } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Undo2, Image as ImageIcon, X, Edit2, Check, Trash2 } from 'lucide-react'
import styles from './GradingView.module.css'
import ImagePreviewModal from './ImagePreviewModal'

// This component handles the grading logic for a single student row
function SubmissionRow({ submission, student, onImageClick }) {
    const [score, setScore] = useState(submission.score ?? '')
    const [feedback, setFeedback] = useState(submission.feedback ?? '')
    const [saving, setSaving] = useState(false)
    const [hoveredImage, setHoveredImage] = useState(null)
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
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setHoveredImage({
                                            url: file.url,
                                            x: rect.right + 15,
                                            y: rect.top - 100
                                        })
                                    }}
                                    onMouseMove={(e) => {
                                        setHoveredImage(prev => prev ? { ...prev, y: e.clientY - 150, x: e.clientX + 15 } : null)
                                    }}
                                    onMouseLeave={() => setHoveredImage(null)}
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
            {hoveredImage && (
                <div
                    className={styles.fixedHoverPreview}
                    style={{
                        top: `${hoveredImage.y}px`,
                        left: `${hoveredImage.x}px`
                    }}
                >
                    <img src={hoveredImage.url} alt="Preview" />
                </div>
            )}
        </div>
    )
}

export default function AssignmentGradingView({ assignment, submissions, subjects = [] }) {
    const [selectedImage, setSelectedImage] = useState(null)
    const [isEditingDeadline, setIsEditingDeadline] = useState(false)
    const [editedDeadline, setEditedDeadline] = useState(assignment?.deadline ? assignment.deadline.slice(0, 16) : '')
    const [savingDeadline, setSavingDeadline] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const router = useRouter()

    // 課題編集モーダル用ステート
    const [isEditingAssignment, setIsEditingAssignment] = useState(false)
    const [editedTitle, setEditedTitle] = useState('')
    const [editedSubject, setEditedSubject] = useState('')
    const [editedDescription, setEditedDescription] = useState('')
    const [editedReleasedAt, setEditedReleasedAt] = useState('')
    const [editedAssignmentDeadline, setEditedAssignmentDeadline] = useState('')
    const [savingAssignment, setSavingAssignment] = useState(false)

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

    const handleAssignmentSave = async (e) => {
        e.preventDefault()
        if (!editedTitle || !editedAssignmentDeadline) {
            alert('必須項目を入力してください')
            return
        }

        setSavingAssignment(true)
        const result = await updateAssignment(assignment.id, {
            title: editedTitle,
            subject: editedSubject,
            description: editedDescription,
            deadline: new Date(editedAssignmentDeadline).toISOString(),
            released_at: editedReleasedAt ? new Date(editedReleasedAt).toISOString() : null
        })

        if (result.error) {
            alert(result.error)
        } else {
            setIsEditingAssignment(false)
            router.refresh()
        }
        setSavingAssignment(false)
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {assignment.subject && (
                            <span className={styles.subjectBadge}>{assignment.subject}</span>
                        )}
                        <h1 className={styles.title}>{assignment.title}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }} className={styles.headerActions}>
                        <button
                            onClick={() => {
                                setEditedTitle(assignment.title || '')
                                setEditedSubject(assignment.subject || '')
                                setEditedDescription(assignment.description || '')
                                setEditedReleasedAt(assignment.released_at ? assignment.released_at.slice(0, 16) : '')
                                setEditedAssignmentDeadline(assignment.deadline ? assignment.deadline.slice(0, 16) : '')
                                setIsEditingAssignment(true)
                            }}
                            className={styles.editAssignmentButton}
                        >
                            <Edit2 size={16} />
                            <span>課題を編集</span>
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className={styles.deleteAssignmentButton}
                        >
                            {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            <span>課題を削除</span>
                        </button>
                    </div>
                </div>
                <div className={styles.meta}>
                    <span>クラス: {assignment.class_name}</span>
                    {assignment.released_at && (
                        <span>公開開始: {new Date(assignment.released_at).toLocaleString('ja-JP')}</span>
                    )}
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

            {/* 課題編集モーダル */}
            {isEditingAssignment && (
                <div className={styles.modalOverlay}>
                    <div className={styles.editModalContent}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>課題を編集</h2>
                            <button
                                onClick={() => setIsEditingAssignment(false)}
                                className={styles.closeModalButton}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAssignmentSave} className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>タイトル <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className={styles.formInput}
                                    required
                                    placeholder="例: 第1回 レポート課題"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>科目</label>
                                <select
                                    value={editedSubject}
                                    onChange={(e) => setEditedSubject(e.target.value)}
                                    className={styles.formInput}
                                >
                                    <option value="">科目を選択</option>
                                    {subjects.map(subj => (
                                        <option key={subj} value={subj}>
                                            {subj}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>説明文</label>
                                <textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    className={styles.formTextarea}
                                    rows={5}
                                    placeholder="課題の内容や注意事項を入力してください"
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>公開開始日時 <span className={styles.hint}>（空欄で即時公開）</span></label>
                                    <input
                                        type="datetime-local"
                                        value={editedReleasedAt}
                                        onChange={(e) => setEditedReleasedAt(e.target.value)}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>提出期限 <span className={styles.required}>*</span></label>
                                    <input
                                        type="datetime-local"
                                        value={editedAssignmentDeadline}
                                        onChange={(e) => setEditedAssignmentDeadline(e.target.value)}
                                        className={styles.formInput}
                                        required
                                    />
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingAssignment(false)}
                                    className={styles.cancelButton}
                                    disabled={savingAssignment}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={savingAssignment}
                                >
                                    {savingAssignment && <Loader2 className="animate-spin" size={16} />}
                                    {savingAssignment ? '保存中...' : '変更を保存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <ImagePreviewModal
                    imageUrl={selectedImage.url}
                    imageName={selectedImage.name}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    )
}
