'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function SubmissionForm({ assignmentId, submission, isPastDue, maxScore }) {
    const router = useRouter()
    const fileInputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState(submission?.content || '')
    const [files, setFiles] = useState([])
    const [uploadedFiles, setUploadedFiles] = useState(submission?.file_urls || [])
    const [uploadProgress, setUploadProgress] = useState(0)

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        setFiles(prev => [...prev, ...selectedFiles])
    }

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const removeUploadedFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const uploadFiles = async (supabase, userId) => {
        const uploadedUrls = [...uploadedFiles]

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
            const filePath = `submissions/${assignmentId}/${userId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('assignments')
                .upload(filePath, file)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            const { data: { publicUrl } } = supabase.storage
                .from('assignments')
                .getPublicUrl(filePath)

            uploadedUrls.push({
                name: file.name,
                url: publicUrl,
                path: filePath
            })

            setUploadProgress(Math.round(((i + 1) / files.length) * 100))
        }

        return uploadedUrls
    }

    const handleSubmit = async (isDraft = false) => {
        setLoading(true)
        setUploadProgress(0)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Upload files if any
        let fileUrls = uploadedFiles
        if (files.length > 0) {
            fileUrls = await uploadFiles(supabase, user?.id)
        }

        const submissionData = {
            assignment_id: assignmentId,
            student_id: user?.id,
            content,
            file_urls: fileUrls,
            status: isDraft ? 'draft' : 'submitted',
            submitted_at: isDraft ? null : new Date().toISOString()
        }

        let error
        if (submission) {
            const { error: updateError } = await supabase
                .from('submissions')
                .update(submissionData)
                .eq('id', submission.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('submissions')
                .insert(submissionData)
            error = insertError
        }

        if (error) {
            alert('保存に失敗しました')
            console.error(error)
        } else {
            setFiles([])
            router.refresh()
        }
        setLoading(false)
        setUploadProgress(0)
    }

    // 採点済みの場合
    if (submission?.status === 'graded') {
        return (
            <div className={styles.gradedResult}>
                <div className={styles.scoreDisplay}>
                    <span className={styles.scoreLabel}>得点</span>
                    <span className={styles.scoreValue}>{submission.score}/{maxScore}点</span>
                </div>
                {submission.feedback && (
                    <div className={styles.feedback}>
                        <h4>フィードバック</h4>
                        <p>{submission.feedback}</p>
                    </div>
                )}
                <div className={styles.submittedContent}>
                    <h4>提出内容</h4>
                    <pre>{submission.content}</pre>
                </div>
                {submission.file_urls?.length > 0 && (
                    <div className={styles.attachedFiles}>
                        <h4>添付ファイル</h4>
                        <ul>
                            {submission.file_urls.map((file, index) => (
                                <li key={index}>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        📎 {file.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )
    }

    // 提出済みで編集可能（未採点の場合は再提出可能）
    if (submission?.status === 'submitted') {
        return (
            <div className={styles.submittedState}>
                <div className={styles.submittedBadge}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 6L8 14l-4-4" />
                    </svg>
                    提出済み
                </div>
                <p className={styles.submittedTime}>
                    提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}
                </p>
                <div className={styles.submittedContent}>
                    <h4>提出内容</h4>
                    <pre>{submission.content}</pre>
                </div>
                {submission.file_urls?.length > 0 && (
                    <div className={styles.attachedFiles}>
                        <h4>添付ファイル</h4>
                        <ul>
                            {submission.file_urls.map((file, index) => (
                                <li key={index}>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        📎 {file.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {/* 再提出ボタン */}
                <div className={styles.resubmitSection}>
                    <p className={styles.resubmitHint}>採点前であれば再提出できます</p>
                    <button
                        onClick={() => {
                            // 再提出モードに戻す
                            setContent(submission.content || '')
                            setUploadedFiles(submission.file_urls || [])
                            // statusを下書きに戻す
                            const updateToDraft = async () => {
                                const supabase = createClient()
                                await supabase
                                    .from('submissions')
                                    .update({ status: 'draft' })
                                    .eq('id', submission.id)
                                router.refresh()
                            }
                            updateToDraft()
                        }}
                        className={styles.resubmitBtn}
                    >
                        再提出する
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.submissionForm}>
            {isPastDue && !submission && (
                <div className={styles.warning}>
                    締切を過ぎています。提出できない場合があります。
                </div>
            )}

            <div className={styles.formGroup}>
                <label>回答内容</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="ここに回答を入力してください..."
                    rows={10}
                    disabled={loading}
                />
            </div>

            {/* ファイルアップロード */}
            <div className={styles.formGroup}>
                <label>ファイル添付</label>
                <div className={styles.fileUploader}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        className={styles.fileInput}
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.fileSelectBtn}
                        disabled={loading}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 4v12M4 10h12" />
                        </svg>
                        ファイルを選択
                    </button>
                    <span className={styles.fileHint}>
                        PDF, Word, 画像など (複数選択可)
                    </span>
                </div>

                {/* 既存のアップロード済みファイル */}
                {uploadedFiles.length > 0 && (
                    <div className={styles.fileList}>
                        <h5>アップロード済み</h5>
                        {uploadedFiles.map((file, index) => (
                            <div key={index} className={styles.fileItem}>
                                <span className={styles.fileName}>📎 {file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeUploadedFile(index)}
                                    className={styles.removeFileBtn}
                                    disabled={loading}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 新規選択ファイル */}
                {files.length > 0 && (
                    <div className={styles.fileList}>
                        <h5>新規ファイル</h5>
                        {files.map((file, index) => (
                            <div key={index} className={styles.fileItem}>
                                <span className={styles.fileName}>📄 {file.name}</span>
                                <span className={styles.fileSize}>
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className={styles.removeFileBtn}
                                    disabled={loading}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* アップロード進捗 */}
                {loading && uploadProgress > 0 && (
                    <div className={styles.uploadProgress}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <span>{uploadProgress}%</span>
                    </div>
                )}
            </div>

            <div className={styles.formActions}>
                <button
                    onClick={() => handleSubmit(true)}
                    disabled={loading || (!content && files.length === 0)}
                    className={styles.draftBtn}
                >
                    下書き保存
                </button>
                <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading || (!content && files.length === 0)}
                    className={styles.submitBtn}
                >
                    {loading ? '送信中...' : '提出する'}
                </button>
            </div>
        </div>
    )
}
