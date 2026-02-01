'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendBroadcast } from '@/actions/messenger'
import { uploadAnnouncementFile } from '@/app/actions/announcements'
import styles from './page.module.css'

export default function NewAnnouncementPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [courses, setCourses] = useState([])
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        course_id: '',
        is_pinned: false,
        delivery_method: 'both', // 'announcement', 'messenger', 'both'
        file_urls: [],
        sender_name: ''
    })
    const [uploading, setUploading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])

    useEffect(() => {
        const loadCourses = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            // 教師の担当コースを取得
            const { data } = await supabase
                .from('courses')
                .select('id, title')
                .eq('teacher_id', user?.id)
                .order('title')

            setCourses(data || [])
        }
        loadCourses()
    }, [])

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setFormData(prev => ({
            ...prev,
            [e.target.name]: value
        }))
    }

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files))
    }

    const uploadFiles = async (files) => {
        const uploadedFiles = []
        const errors = []

        for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)

            const result = await uploadAnnouncementFile(formData)

            if (!result.success) {
                console.error('Server Upload Error:', result.error)
                errors.push(`${file.name}: ${result.error}`)
                continue
            }

            uploadedFiles.push(result.file)
        }

        if (errors.length > 0) {
            const errorMsg = `ファイルのアップロードに失敗しました:\n${errors.join('\n')}\n\n※バケット「announcements」が作成されているか確認してください。`;
            alert(errorMsg);
            throw new Error(errorMsg); // 呼び出し元で中断させるため
        }

        return uploadedFiles
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            // ファイルアップロード
            let uploadedFileUrls = []
            if (selectedFiles.length > 0) {
                setUploading(true)
                uploadedFileUrls = await uploadFiles(selectedFiles)
                setUploading(false)
            }

            const isAnnouncement = formData.delivery_method === 'announcement' || formData.delivery_method === 'both'
            const isMessenger = formData.delivery_method === 'messenger' || formData.delivery_method === 'both'

            let insertError = null
            if (isAnnouncement) {
                const { error } = await supabase
                    .from('announcements')
                    .insert({
                        title: formData.title,
                        content: formData.content,
                        course_id: formData.course_id || null,
                        is_pinned: formData.is_pinned,
                        author_id: user?.id,
                        file_urls: uploadedFileUrls,
                        sender_name: formData.sender_name || null
                    })
                insertError = error
            }

            if (insertError) {
                alert('お知らせの作成に失敗しました')
                console.error(insertError)
                setLoading(false)
                return
            }

            let broadcastResults = null
            // Messenger配信
            if (isMessenger) {
                const targetType = formData.course_id ? 'course' : 'all';
                const targetValue = formData.course_id || null;

                let messageString = `【お知らせ：${formData.title}】\n`;
                if (formData.sender_name) {
                    messageString += `【配信者：${formData.sender_name}】\n`;
                }
                messageString += `\n${formData.content}`;

                // 添付ファイルがあればリンクを追加
                if (uploadedFileUrls.length > 0) {
                    messageString += '\n\n【添付ファイル】 このファイルを見てください。';
                    uploadedFileUrls.forEach(file => {
                        messageString += `\n📎 ${file.name}: ${file.url}`;
                    });
                }

                const result = await sendBroadcast(messageString, targetType, targetValue);
                if (!result.success) {
                    console.error('Messenger Broadcast Failed:', result.error);
                    alert(`Messenger配信に失敗しました: ${result.error}`);
                } else {
                    broadcastResults = result;
                    if (result.count === 0 && isMessenger && !isAnnouncement) {
                        alert('Messenger送信対象の学生（連携済み）が見つかりませんでした。');
                    }
                }
            }

            // 完了メッセージの構築
            let successMessage = 'お知らせの投稿が完了しました！'
            if (uploadedFileUrls.length > 0) {
                successMessage += `\n📎 ${uploadedFileUrls.length}件のファイルを添付しました。`
            }
            if (broadcastResults) {
                successMessage += `\n💬 ${broadcastResults.count}人の学生にMessengerを送信しました。`
                if (broadcastResults.failed > 0) {
                    successMessage += ` (失敗: ${broadcastResults.failed}人)`
                }
            }

            alert(successMessage)
            router.push('/announcements')

        } catch (err) {
            console.error('Submit handle error:', err);
            // uploadFilesでの例外（エラー時の中断）も含めてここでキャッチ
            setLoading(false)
            setUploading(false)
        }
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>新規お知らせ作成</h1>
                <p className={styles.subtitle}>学生に向けてお知らせを投稿します</p>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="title" className={styles.label}>
                        タイトル <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="お知らせのタイトル"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="content" className={styles.label}>
                        内容 <span className={styles.required}>*</span>
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        className={styles.textarea}
                        placeholder="お知らせの内容を入力..."
                        rows={8}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="course_id" className={styles.label}>
                        対象コース（任意）
                    </label>
                    <select
                        id="course_id"
                        name="course_id"
                        value={formData.course_id}
                        onChange={handleChange}
                        className={styles.select}
                    >
                        <option value="">全体向け（コースを指定しない）</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>配信方法</label>
                    <div className={styles.deliveryOptions}>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="delivery_method"
                                value="announcement"
                                checked={formData.delivery_method === 'announcement'}
                                onChange={handleChange}
                            />
                            お知らせ掲載のみ
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="delivery_method"
                                value="messenger"
                                checked={formData.delivery_method === 'messenger'}
                                onChange={handleChange}
                            />
                            Messenger配信のみ
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="delivery_method"
                                value="both"
                                checked={formData.delivery_method === 'both'}
                                onChange={handleChange}
                            />
                            お知らせとMessenger両方
                        </label>
                    </div>
                </div>

                {(formData.delivery_method === 'announcement' || formData.delivery_method === 'both') && (
                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="is_pinned"
                            name="is_pinned"
                            checked={formData.is_pinned}
                            onChange={handleChange}
                            className={styles.checkbox}
                        />
                        <label htmlFor="is_pinned" className={styles.checkboxLabel}>
                            📌 上部にピン留めする
                        </label>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="files" className={styles.label}>
                        添付ファイル
                    </label>
                    <input
                        type="file"
                        id="files"
                        multiple
                        onChange={handleFileChange}
                        className={styles.fileInput}
                    />
                    {selectedFiles.length > 0 && (
                        <div className={styles.selectedFiles}>
                            {selectedFiles.map((file, index) => (
                                <div key={index} className={styles.fileItem}>
                                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={styles.cancelBtn}
                    >
                        キャンセル
                    </button>
                    <button
                        type="submit"
                        disabled={loading || uploading || !formData.title || !formData.content}
                        className={styles.submitBtn}
                    >
                        {loading || uploading ? '投稿中...' : '投稿する'}
                    </button>
                </div>
            </form>
        </div>
    )
}
