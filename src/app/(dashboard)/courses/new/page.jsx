'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCourse } from '@/app/actions/courseData'
import styles from './page.module.css'

export default function NewCoursePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        syllabus: '',
        is_published: false
    })

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
        setError(null)

        try {
            const data = await createCourse(formData)
            router.push(`/courses/${data.id}`)
        } catch (err) {
            setError('コースの作成に失敗しました')
            console.error(err)
            setLoading(false)
        }
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>新規コース作成</h1>
                <p className={styles.subtitle}>コースの基本情報を入力してください</p>
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
                        すぐに公開する
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
                        disabled={loading || !formData.title}
                        className={styles.submitBtn}
                    >
                        {loading ? '作成中...' : 'コースを作成'}
                    </button>
                </div>
            </form>
        </div>
    )
}
