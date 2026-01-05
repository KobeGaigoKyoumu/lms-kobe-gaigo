'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function NewAssignmentPage({ params }) {
    const router = useRouter()
    const courseId = params.id
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        max_score: 100,
        is_published: false
    })

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked :
            e.target.type === 'number' ? parseInt(e.target.value) : e.target.value
        setFormData(prev => ({
            ...prev,
            [e.target.name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()

        const { data, error } = await supabase
            .from('assignments')
            .insert({
                ...formData,
                course_id: courseId,
                due_date: formData.due_date || null
            })
            .select()
            .single()

        if (error) {
            alert('課題の作成に失敗しました')
            console.error(error)
            setLoading(false)
            return
        }

        router.push(`/assignments/${data.id}`)
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>新規課題作成</h1>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="title">課題タイトル <span className={styles.required}>*</span></label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="例: 第1課　自己紹介"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="description">課題内容</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="課題の詳細を入力..."
                        rows={6}
                    />
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="due_date">締切日時</label>
                        <input
                            type="datetime-local"
                            id="due_date"
                            name="due_date"
                            value={formData.due_date}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="max_score">配点</label>
                        <input
                            type="number"
                            id="max_score"
                            name="max_score"
                            value={formData.max_score}
                            onChange={handleChange}
                            min="1"
                            max="1000"
                        />
                    </div>
                </div>

                <div className={styles.checkboxGroup}>
                    <input
                        type="checkbox"
                        id="is_published"
                        name="is_published"
                        checked={formData.is_published}
                        onChange={handleChange}
                    />
                    <label htmlFor="is_published">すぐに公開する</label>
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
                        {loading ? '作成中...' : '課題を作成'}
                    </button>
                </div>
            </form>
        </div>
    )
}
