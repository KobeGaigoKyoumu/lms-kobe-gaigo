'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateCourse, deleteCourse } from '@/app/actions/courseData'
import styles from './page.module.css'

export default function EditCoursePage({ params }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [courseId, setCourseId] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        syllabus: '',
        is_published: false
    })

    useEffect(() => {
        const loadCourse = async () => {
            const resolvedParams = await params
            setCourseId(resolvedParams.id)

            const supabase = createClient()
            const { data: course, error } = await supabase
                .from('courses')
                .select('*')
                .eq('id', resolvedParams.id)
                .single()

            if (error || !course) {
                setError('コースが見つかりません')
                setLoading(false)
                return
            }

            setFormData({
                title: course.title || '',
                description: course.description || '',
                syllabus: course.syllabus || '',
                is_published: course.is_published || false
            })
            setLoading(false)
        }

        loadCourse()
    }, [params])

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setFormData(prev => ({
            ...prev,
            [e.target.name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        try {
            await updateCourse(courseId, {
                ...formData,
                updated_at: new Date().toISOString()
            })
            router.push(`/courses/${courseId}`)
            router.refresh() // Ensure server components re-fetch
        } catch (updateError) {
            setError('コースの更新に失敗しました')
            console.error(updateError)
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await deleteCourse(courseId)
            router.push('/courses')
            router.refresh()
        } catch (deleteError) {
            setError('コースの削除に失敗しました')
            console.error(deleteError)
            setDeleting(false)
        }
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
                <h1 className={styles.title}>コースを編集</h1>
                <p className={styles.subtitle}>コースの情報を更新できます</p>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && (
                    <div className={styles.error}>{error}</div>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="title" className={styles.label}>
                        コースタイトル <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="例: 日本語初級 N5"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="description" className={styles.label}>説明</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className={styles.textarea}
                        placeholder="コースの概要を入力..."
                        rows={4}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="syllabus" className={styles.label}>シラバス</label>
                    <textarea
                        id="syllabus"
                        name="syllabus"
                        value={formData.syllabus}
                        onChange={handleChange}
                        className={styles.textarea}
                        placeholder="週ごとの学習内容など..."
                        rows={8}
                    />
                </div>

                <div className={styles.checkboxGroup}>
                    <input
                        type="checkbox"
                        id="is_published"
                        name="is_published"
                        checked={formData.is_published}
                        onChange={handleChange}
                        className={styles.checkbox}
                    />
                    <label htmlFor="is_published" className={styles.checkboxLabel}>
                        コースを公開する
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
                        disabled={saving || !formData.title}
                        className={styles.submitBtn}
                    >
                        {saving ? '保存中...' : '変更を保存'}
                    </button>
                </div>
            </form>

            {/* 削除セクション */}
            <div className={styles.dangerZone}>
                <h3>危険な操作</h3>
                <p>コースを削除すると、関連する課題や提出物も全て削除されます。この操作は取り消せません。</p>

                {!showDeleteConfirm ? (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className={styles.deleteBtn}
                    >
                        コースを削除
                    </button>
                ) : (
                    <div className={styles.deleteConfirm}>
                        <p>本当に削除しますか？</p>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className={styles.cancelBtn}
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className={styles.confirmDeleteBtn}
                            >
                                {deleting ? '削除中...' : '削除する'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
