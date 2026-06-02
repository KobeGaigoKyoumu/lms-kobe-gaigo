'use client'

import { useState, useRef } from 'react'
import { submitHomework, uploadSubmissionFile } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import styles from './SubmissionForm.module.css'
import ImagePreviewModal from './ImagePreviewModal'

export default function SubmissionForm({ assignmentId, initialComment = '', initialFiles = [] }) {
    const [comment, setComment] = useState(initialComment)
    const [files, setFiles] = useState(initialFiles) // Array of { name, url }
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)
    const fileInputRef = useRef(null)
    const router = useRouter()

    // 圧縮処理
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const MAX_WIDTH = 1280;
                    const MAX_HEIGHT = 1280;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Canvas is empty'));
                            return;
                        }
                        const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                        let compressedFile;
                        try {
                            compressedFile = new File([blob], newName, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                        } catch (e) {
                            // Fileコンストラクタが古いブラウザやWebViewで失敗した場合のBlobフォールバック
                            compressedFile = blob;
                            compressedFile.name = newName;
                            compressedFile.lastModified = Date.now();
                        }
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = async (e) => {
        if (!e.target.files?.length) return

        setUploading(true)
        const newFiles = []
        const oversizedFiles = []
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        try {
            for (const file of e.target.files) {
                let processedFile = file;

                if (file.type.startsWith('image/')) {
                    try {
                        processedFile = await compressImage(file);
                    } catch (error) {
                        console.error('Compression failed, using original', error);
                    }
                }

                if (processedFile.size > MAX_SIZE) {
                    oversizedFiles.push(file.name);
                    continue;
                }

                // サーバーアクションを介して Supabase Storage へアップロード
                const formData = new FormData()
                formData.append('file', processedFile, file.name)
                formData.append('assignmentId', assignmentId)

                const result = await uploadSubmissionFile(formData)

                if (result.error) {
                    throw new Error(result.error)
                }

                newFiles.push({
                    name: file.name,
                    url: result.url,
                    path: result.path
                })
            }

            if (oversizedFiles.length > 0) {
                alert(`以下のファイルは圧縮後もサイズが大きすぎます（最大5MB）:\n${oversizedFiles.join('\n')}`);
            }

            setFiles(prev => [...prev, ...newFiles])
        } catch (error) {
            console.error('Upload failed:', error)
            alert('アップロードに失敗しました。')
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
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
                                ref={fileInputRef}
                            />
                        </label>
                        <span className={styles.hint}>※ 画像、PDFなどをアップロードできます (1ファイル最大5MB。画像は自動圧縮されます)</span>
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
                <ImagePreviewModal
                    imageUrl={selectedImage.url}
                    imageName={selectedImage.name}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </>
    )
}
