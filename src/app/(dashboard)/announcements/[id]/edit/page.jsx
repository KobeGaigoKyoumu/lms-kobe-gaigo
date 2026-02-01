'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadAnnouncementFile } from '@/app/actions/announcements'
import styles from './page.module.css'

export default function EditAnnouncementPage({ params }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [courses, setCourses] = useState([])
    const [announcementId, setAnnouncementId] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        course_id: '',
        is_pinned: false,
        file_urls: [],
        sender_name: ''
    })
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const resolvedParams = await params
            setAnnouncementId(resolvedParams.id)

            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            // お知らせ取得
            const { data: announcement, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('id', resolvedParams.id)
                .single()

            if (error || !announcement) {
                alert('お知らせが見つかりません')
                router.push('/announcements')
                return
            }

            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                course_id: announcement.course_id || '',
                is_pinned: announcement.is_pinned || false,
                file_urls: announcement.file_urls || [],
                sender_name: announcement.sender_name || ''
            })

            // コース取得
            const { data: coursesData } = await supabase
                .from('courses')
                .select('id, title')
                .eq('teacher_id', user?.id)
                .order('title')

            setCourses(coursesData || [])
            setLoading(false)
        }

        loadData()
    }, [params, router])

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

    const removeExistingFile = (index) => {
        setFormData(prev => ({
            ...prev,
            file_urls: prev.file_urls.filter((_, i) => i !== index)
        }))
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
        setSaving(true)

        const supabase = createClient()

        // 新規ファイルがあればアップロード
        let newFileUrls = [...formData.file_urls]
        if (selectedFiles.length > 0) {
            setUploading(true)
            const uploaded = await uploadFiles(selectedFiles)
            newFileUrls = [...newFileUrls, ...uploaded]
        }

        const { error } = await supabase
            .from('announcements')
            .update({
                title: formData.title,
                content: formData.content,
                course_id: formData.course_id || null,
                is_pinned: formData.is_pinned,
                file_urls: newFileUrls,
                sender_name: formData.sender_name || null
            })
            .eq('id', announcementId)

        if (error) {
            alert('お知らせの更新に失敗しました')
            console.error(error)
            setSaving(false)
            return
        }

        router.push('/announcements')
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>読み込み中...</div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>お知らせを編集</h1>
                <p className={styles.subtitle}>お知らせの内容を更新できます</p>
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
                    <label htmlFor="sender_name" className={styles.label}>
                        配信者（任意）
                    </label>
                    <input
                        type="text"
                        id="sender_name"
                        name="sender_name"
                        value={formData.sender_name}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="配信者の名前"
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

                <div className={styles.formGroup}>
                    <label className={styles.label}>現在の添付ファイル</label>
                    {formData.file_urls.length > 0 ? (
                        <div className={styles.fileList}>
                            {formData.file_urls.map((file, index) => (
                                <div key={index} className={styles.fileItem}>
                                    <span>📎 {file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeExistingFile(index)}
                                        className={styles.removeFileBtn}
                                    >
                                        削除
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noFiles}>添付ファイルはありません</p>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="files" className={styles.label}>
                        新しいファイルを添付
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
                        disabled={saving || uploading || !formData.title || !formData.content}
                        className={styles.submitBtn}
                    >
                        {saving || uploading ? '保存中...' : '変更を保存'}
                    </button>
                </div>
            </form>
        </div>
    )
}
