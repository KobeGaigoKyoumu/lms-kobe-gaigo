'use client'

import { useState } from 'react'
import { submitHomework, uploadSubmissionFile } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import styles from './SubmissionForm.module.css'

export default function SubmissionForm({ assignmentId, initialComment = '', initialFiles = [] }) {
    const [comment, setComment] = useState(initialComment)
    const [files, setFiles] = useState(initialFiles) // Array of { name, url }
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)
    const router = useRouter()

    const handleFileChange = async (e) => {
        if (!e.target.files?.length) return

        setUploading(true)
        const newFiles = []

        try {
            for (const file of e.target.files) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('assignmentId', assignmentId)

                const result = await uploadSubmissionFile(formData)

                if (result.error) throw new Error(result.error)

                newFiles.push({
                    name: result.name,
                    url: result.url
                })
            }
            setFiles(prev => [...prev, ...newFiles])
        } catch (error) {
            console.error('Upload failed:', error)
            alert('アップロードに失敗しました。')
        } finally {
            setUploading(false)
        }
    }

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const isImage = (filename) => {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const result = await submitHomework(assignmentId, comment, files)
            if (result.error) {
                alert(result.error)
            } else {
                alert('提出しました！')
                router.push('/student/dashboard')
            }
        } catch (error) {
            alert('エラーが発生しました。')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.group}>
                    <label className={styles.label}>コメント / 回答</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className={styles.textarea}
                        placeholder="先生へのコメントや、テキストでの回答が必要な場合はここに入力してください。"
                    />
                </div>

                <div className={styles.group}>
                    <label className={styles.label}>ファイル提出 (画像など)</label>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className={styles.fileList}>
                            {files.map((file, i) => (
                                <div key={i} className={styles.fileItem}>
                                    <div className={styles.fileInfo}>
                                        {isImage(file.name) ? (
                                            <div
                                                className={styles.imageWrapper}
                                                onClick={() => setSelectedImage(file)}
                                            >
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className={styles.imageThumbnail}
                                                />
                                            </div>
                                        ) : (
                                            <ImageIcon size={16} className={styles.fileIcon} />
                                        )}
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.fileName}>
                                            {file.name}
                                        </a>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className={styles.removeButton}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload Button */}
                    <div className={styles.uploadArea}>
                        <label className={`${styles.uploadLabel} ${uploading ? styles.disabled : ''}`}>
                            {uploading ? <Loader2 className={styles.spinner} size={20} /> : <Upload size={20} />}
                            <span>{uploading ? 'アップロード中...' : 'ファイルを選択'}</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className={styles.hiddenInput}
                                disabled={uploading}
                            />
                        </label>
                        <span className={styles.hint}>※ 画像、PDFなどをアップロードできます</span>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        type="submit"
                        disabled={submitting || uploading}
                        className={styles.submitButton}
                    >
                        {submitting && <Loader2 className={styles.spinner} />}
                        {submitting ? '提出中...' : '課題を提出する'}
                    </button>
                </div>
            </form>

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
        </>
    )
}
