'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendTelegramBroadcast } from '@/actions/telegram'
import { uploadAnnouncementFile } from '@/app/actions/announcements'
import styles from './page.module.css'

export default function NewAnnouncementPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [courses, setCourses] = useState([])
    const [allStudents, setAllStudents] = useState([])
    const [allClasses, setAllClasses] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStudents, setSelectedStudents] = useState([]) // For individual targeting

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_type: 'all', // 'all', 'grade', 'class', 'individual', 'course'
        target_grade: '',
        target_class: '',
        course_id: '',
        is_pinned: false,
        delivery_method: 'both',
        file_urls: [],
        sender_name: ''
    })
    const [uploading, setUploading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])

    useEffect(() => {
        const loadInitialData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            // Fetch Courses
            let coursesQuery = supabase
                .from('courses')
                .select('id, title')
                .order('title')

            // Admin member (no user) gets all courses
            if (user) {
                coursesQuery = coursesQuery.eq('teacher_id', user.id)
            }

            const { data: coursesData } = await coursesQuery
            setCourses(coursesData || [])

            // Fetch Students (for Individual targeting)
            const { data: studentsData } = await supabase
                .from('students')
                .select('student_id_text, full_name, class_name')
                .eq('status', 'active')
                .order('full_name')
            setAllStudents(studentsData || [])

            // Extract Unique Classes
            const uniqueClasses = [...new Set((studentsData || []).map(s => s.class_name).filter(Boolean))].sort()
            setAllClasses(uniqueClasses)
        }
        loadInitialData()
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

    // Image Compression Utility
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

                    // Max dimensions
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
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    }, 'image/jpeg', 0.7); // 70% quality
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const uploadFiles = async (files) => {
        const uploadedFiles = []
        const errors = []

        for (const file of files) {
            let processedFile = file;

            // Compress if image
            if (file.type.startsWith('image/')) {
                try {
                    processedFile = await compressImage(file);
                } catch (e) {
                    console.error('Compression failed', e);
                }
            }

            // Check size (1MB)
            if (processedFile.size > 1024 * 1024) {
                errors.push(`${file.name}: サイズが大きすぎます (最大1MB)`);
                continue;
            }

            const formData = new FormData()
            formData.append('file', processedFile)

            const result = await uploadAnnouncementFile(formData)

            if (!result.success) {
                console.error('Server Upload Error:', result.error)
                errors.push(`${file.name}: ${result.error}`)
                continue
            }

            uploadedFiles.push(result.file)
        }

        if (errors.length > 0) {
            const errorMsg = `一部のファイルのアップロードに失敗しました:\n${errors.join('\n')}`;
            alert(errorMsg);
            if (uploadedFiles.length === 0) { // All failed
                throw new Error(errorMsg);
            }
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
            const isTelegram = formData.delivery_method === 'telegram' || formData.delivery_method === 'both'

            let insertError = null
            if (isAnnouncement) {
                const { error } = await supabase
                    .from('announcements')
                    .insert({
                        title: formData.title,
                        content: formData.content,
                        target_type: formData.target_type,
                        target_grade: formData.target_type === 'grade' ? formData.target_grade : null,
                        target_class: formData.target_type === 'class' ? formData.target_class : null,
                        target_student_ids: formData.target_type === 'individual' ? selectedStudents.map(s => s.student_id_text) : null,
                        course_id: formData.target_type === 'course' ? formData.course_id : null,
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
            // Telegram配信
            if (isTelegram) {
                let targetType = formData.target_type;
                let targetValue = null;

                if (targetType === 'all') {
                    targetValue = 'all';
                } else if (targetType === 'grade') {
                    targetValue = formData.target_grade;
                } else if (targetType === 'class') {
                    targetValue = formData.target_class;
                } else if (targetType === 'individual') {
                    targetType = 'students';
                    targetValue = selectedStudents.map(s => s.student_id_text);
                } else if (targetType === 'course') {
                    targetValue = formData.course_id;
                }

                let messageString = `【お知らせ：${formData.title}】\n\n${formData.content}`;
                if (formData.sender_name) {
                    messageString += `\n\n(${formData.sender_name}) より`;
                }

                // 添付ファイルがあればリンクを追加
                if (uploadedFileUrls.length > 0) {
                    messageString += '\n\n【添付ファイル】\nこのファイルを見てください。';
                    uploadedFileUrls.forEach(file => {
                        messageString += `\n📎 ${file.name}:\n${file.url}`;
                    });
                }

                const result = await sendTelegramBroadcast(messageString, targetType, targetValue);
                if (!result.success) {
                    console.error('Telegram Broadcast Failed:', result.error);
                    alert(`Telegram配信に失敗しました: ${result.error}`);
                } else {
                    broadcastResults = result;
                    if (result.count === 0 && isTelegram && !isAnnouncement) {
                        alert('Telegram送信対象の学生（連携済み）が見つかりませんでした。');
                    }
                }
            }

            // 完了メッセージの構築
            let successMessage = 'お知らせの投稿が完了しました！'
            if (uploadedFileUrls.length > 0) {
                successMessage += `\n📎 ${uploadedFileUrls.length}件のファイルを添付しました。`
            }
            if (broadcastResults) {
                successMessage += `\n💬 ${broadcastResults.count}人の学生にTelegramを送信しました。`
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
                        placeholder="配信者の名前（例：教務課 山田）"
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
                            id="course_id"
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
                                value="telegram"
                                checked={formData.delivery_method === 'telegram'}
                                onChange={handleChange}
                            />
                            Telegram配信のみ
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="delivery_method"
                                value="both"
                                checked={formData.delivery_method === 'both'}
                                onChange={handleChange}
                            />
                            お知らせとTelegram両方
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
