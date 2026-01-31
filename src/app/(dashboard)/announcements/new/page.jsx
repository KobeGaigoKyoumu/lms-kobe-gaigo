'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendBroadcast } from '@/actions/messenger'
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
        send_to_messenger: false
    })

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('announcements')
            .insert({
                title: formData.title,
                content: formData.content,
                course_id: formData.course_id || null,
                is_pinned: formData.is_pinned,
                author_id: user?.id
            })

        if (error) {
            alert('お知らせの作成に失敗しました')
            console.error(error)
            setLoading(false)
            return
        }

        // Messenger配信
        if (formData.send_to_messenger) {
            const targetType = formData.course_id ? 'course' : 'all';
            const targetValue = formData.course_id || null;
            const message = `【お知らせ: ${formData.title}】\n\n${formData.content}`;

            const result = await sendBroadcast(message, targetType, targetValue);
            if (!result.success) {
                console.error('Messenger Broadcast Failed:', result.error);
                // We don't block the UI flow, just log it. Maybe show toast? 
                // For simplicity, we assume success or silent fail.
            }
        }

        router.push('/announcements')
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

                <div className={styles.checkboxGroup}>
                    <input
                        type="checkbox"
                        id="send_to_messenger"
                        name="send_to_messenger"
                        checked={formData.send_to_messenger}
                        onChange={handleChange}
                        className={styles.checkbox}
                    />
                    <label htmlFor="send_to_messenger" className={styles.checkboxLabel}>
                        ⚡ Messengerでも配信する
                    </label>
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
                        disabled={loading || !formData.title || !formData.content}
                        className={styles.submitBtn}
                    >
                        {loading ? '投稿中...' : '投稿する'}
                    </button>
                </div>
            </form>
        </div>
    )
}
