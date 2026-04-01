'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadAnnouncementFile } from '@/app/actions/announcements'
import { useStudentStatus } from '@/context/StudentStatusContext'
import styles from './page.module.css'

export default function EditAnnouncementPage({ params }) {
    const router = useRouter()
    const { userId: contextUserId } = useStudentStatus()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [courses, setCourses] = useState([])
    const [announcementId, setAnnouncementId] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_type: 'all',
        target_grade: '',
        target_class: '',
        course_id: '',
        is_pinned: false,
        file_urls: [],
        sender_name: ''
    })
    const [allStudents, setAllStudents] = useState([])
    const [allClasses, setAllClasses] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStudents, setSelectedStudents] = useState([])
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const resolvedParams = await params
            setAnnouncementId(resolvedParams.id)

            const supabase = createClient()

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

            // Fetch Students and Classes
            const { data: studentsData } = await supabase
                .from('students')
                .select('student_id_text, full_name, class_name')
                .eq('status', 'active')
                .order('full_name')
            setAllStudents(studentsData || [])

            const uniqueClasses = [...new Set((studentsData || []).map(s => s.class_name).filter(Boolean))].sort()
            setAllClasses(uniqueClasses)

            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                target_type: announcement.target_type || 'all',
                target_grade: announcement.target_grade || '',
                target_class: announcement.target_class || '',
                course_id: announcement.course_id || '',
                is_pinned: announcement.is_pinned || false,
                file_urls: announcement.file_urls || [],
                sender_name: announcement.sender_name || ''
            })

            if (announcement.target_type === 'individual' && announcement.target_student_ids) {
                const selected = (studentsData || []).filter(s =>
                    announcement.target_student_ids.includes(s.student_id_text)
                )
                setSelectedStudents(selected)
            }

            // コース取得
            let coursesQuery = supabase
                .from('courses')
                .select('id, title')
                .order('title')

            // Admin member (no user) gets all courses
            if (contextUserId && contextUserId !== 'member') {
                coursesQuery = coursesQuery.eq('teacher_id', contextUserId)
            }

            const { data: coursesData } = await coursesQuery

            setCourses(coursesData || [])
            setLoading(false)
        }

        loadData()
    }, [params, router, contextUserId])

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
                target_type: formData.target_type,
                target_grade: formData.target_type === 'grade' ? formData.target_grade : null,
                target_class: formData.target_type === 'class' ? formData.target_class : null,
                target_student_ids: formData.target_type === 'individual' ? selectedStudents.map(s => s.student_id_text) : null,
                course_id: formData.target_type === 'course' ? formData.course_id : null,
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
                    <label className={styles.label}>配信対象</label>
                    <div className={styles.targetOptions}>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="target_type"
                                value="all"
                                checked={formData.target_type === 'all'}
                                onChange={handleChange}
                            />
                            全体
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="target_type"
                                value="grade"
                                checked={formData.target_type === 'grade'}
                                onChange={handleChange}
                            />
                            学年
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="target_type"
                                value="class"
                                checked={formData.target_type === 'class'}
                                onChange={handleChange}
                            />
                            クラス
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="target_type"
                                value="individual"
                                checked={formData.target_type === 'individual'}
                                onChange={handleChange}
                            />
                            個人
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="target_type"
                                value="course"
                                checked={formData.target_type === 'course'}
                                onChange={handleChange}
                            />
                            コース
                        </label>
                    </div>
                </div>

                {formData.target_type === 'grade' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="target_grade" className={styles.label}>対象学年</label>
                        <select
                            id="target_grade"
                            name="target_grade"
                            value={formData.target_grade}
                            onChange={handleChange}
                            className={styles.select}
                            required
                        >
                            <option value="">学年を選択してください</option>
                            <option value="1">1年生</option>
                            <option value="2">2年生</option>
                        </select>
                    </div>
                )}

                {formData.target_type === 'class' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="target_class" className={styles.label}>対象クラス</label>
                        <select
                            id="target_class"
                            name="target_class"
                            value={formData.target_class}
                            onChange={handleChange}
                            className={styles.select}
                            required
                        >
                            <option value="">クラスを選択してください</option>
                            {allClasses.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                )}

                {formData.target_type === 'individual' && (
                    <div className={styles.formGroup}>
                        <label className={styles.label}>個人を選択（複数可）</label>
                        <div className={styles.studentSearchWrapper}>
                            <input
                                type="text"
                                placeholder="名前や学籍番号で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            {searchQuery && (
                                <div className={styles.searchResults}>
                                    {allStudents
                                        .filter(s =>
                                            s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            s.student_id_text.includes(searchQuery)
                                        )
                                        .slice(0, 10)
                                        .map(s => (
                                            <div
                                                key={s.student_id_text}
                                                className={styles.searchResultItem}
                                                onClick={() => {
                                                    if (!selectedStudents.find(ss => ss.student_id_text === s.student_id_text)) {
                                                        setSelectedStudents([...selectedStudents, s]);
                                                    }
                                                    setSearchQuery('');
                                                }}
                                            >
                                                {s.full_name} ({s.student_id_text}) - {s.class_name}
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                        <div className={styles.selectedStudentsList}>
                            {selectedStudents.map(s => (
                                <span key={s.student_id_text} className={styles.selectedStudentTag}>
                                    {s.full_name}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudents(selectedStudents.filter(ss => ss.student_id_text !== s.student_id_text))}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {formData.target_type === 'course' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="course_id" className={styles.label}>対象コース</label>
                        <select
                            id="target_course"
                            name="course_id"
                            value={formData.course_id}
                            onChange={handleChange}
                            className={styles.select}
                            required
                        >
                            <option value="">コースを選択してください</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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
