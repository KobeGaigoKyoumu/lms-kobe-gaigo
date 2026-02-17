'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function EventModal({ event, date, onClose, onSave, userId }) {
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [courses, setCourses] = useState([])
    const [classes, setClasses] = useState([])
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        all_day: true,
        event_type: 'other',
        course_id: '',
        target_class: '',
        color: ''
    })

    const formatDateTimeLocal = useCallback((date, allDay = false) => {
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')

        if (allDay) {
            return `${year}-${month}-${day}`
        }

        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }, [])

    useEffect(() => {
        // Load teacher's courses and available classes
        const loadData = async () => {
            const supabase = createClient()

            // Courses
            const { data: courseData } = await supabase
                .from('courses')
                .select('id, title')
                .order('title')
            setCourses(courseData || [])

            // Classes (distinct from students)
            const { data: studentData } = await supabase
                .from('students')
                .select('class_name')
                .not('class_name', 'is', null)
                .order('class_name')

            // Extract unique class names
            const uniqueClasses = [...new Set(studentData?.map(s => s.class_name))].filter(Boolean)
            setClasses(uniqueClasses)
        }
        loadData()

        // Set initial form data
        if (event) {
            setFormData({
                title: event.title || '',
                description: event.description || '',
                start_date: formatDateTimeLocal(new Date(event.date), event.all_day),
                end_date: event.endDate ? formatDateTimeLocal(new Date(event.endDate), event.all_day) : '',
                all_day: event.allDay !== false,
                event_type: event.type || 'other',
                course_id: event.course_id || '',
                target_class: event.targetClass || '',
                color: event.color || ''
            })
        } else if (date) {
            setFormData(prev => ({
                ...prev,
                start_date: formatDateTimeLocal(date, prev.all_day),
                end_date: ''
            }))
        }
    }, [event, date, formatDateTimeLocal])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target

        if (name === 'all_day') {
            // When switching types, reformat the dates
            setFormData(prev => {
                const startDate = prev.start_date ? new Date(prev.start_date) : new Date()
                const endDate = prev.end_date ? new Date(prev.end_date) : null

                return {
                    ...prev,
                    all_day: checked,
                    start_date: formatDateTimeLocal(startDate, checked),
                    end_date: endDate ? formatDateTimeLocal(endDate, checked) : ''
                }
            })
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()

        // For all_day events, we need to ensure local time is preserved when converting to ISO
        // Or simply append time part if it's missing (though for DB handling, ISO string is expected)
        // If all_day is true, input is YYYY-MM-DD. We can append T00:00:00 to make it a valid ISO start

        let startTime = formData.start_date
        let endTime = formData.end_date

        if (formData.all_day) {
            // Append time component if missing
            if (startTime && !startTime.includes('T')) startTime += 'T00:00:00'
            if (endTime && !endTime.includes('T')) endTime += 'T23:59:59'
        }

        const eventData = {
            title: formData.title,
            description: formData.description || null,
            start_date: new Date(startTime).toISOString(),
            end_date: endTime ? new Date(endTime).toISOString() : null,
            all_day: formData.all_day,
            event_type: formData.event_type,
            course_id: formData.course_id || null,
            target_class: formData.target_class || null,
            color: formData.color || null,
            created_by: userId
        }

        let error
        if (event) {
            // Update
            const { error: updateError } = await supabase
                .from('calendar_events')
                .update(eventData)
                .eq('id', event.id)
            error = updateError
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('calendar_events')
                .insert(eventData)
            error = insertError
        }

        if (error) {
            alert('イベントの保存に失敗しました')
            console.error(error)
            setLoading(false)
            return
        }

        onSave()
    }

    const handleDelete = async () => {
        if (!confirm('このイベントを削除しますか？')) return

        setDeleting(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', event.id)

        if (error) {
            alert('削除に失敗しました')
            console.error(error)
            setDeleting(false)
            return
        }

        onSave()
    }

    const eventTypes = [
        { value: 'class', label: '授業' },
        { value: 'exam', label: '試験' },
        { value: 'holiday', label: '休日' },
        { value: 'other', label: 'その他' }
    ]

    const colors = [
        { value: '#3b82f6', label: '青' },
        { value: '#ef4444', label: '赤' },
        { value: '#22c55e', label: '緑' },
        { value: '#f59e0b', label: '黄' },
        { value: '#8b5cf6', label: '紫' },
        { value: '#ec4899', label: 'ピンク' }
    ]

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{event ? 'イベント編集' : '新規イベント'}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="title">タイトル *</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="イベント名"
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="event_type">種類</label>
                            <select
                                id="event_type"
                                name="event_type"
                                value={formData.event_type}
                                onChange={handleChange}
                            >
                                {eventTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="color">色</label>
                            <select
                                id="color"
                                name="color"
                                value={formData.color}
                                onChange={handleChange}
                            >
                                <option value="">自動</option>
                                {colors.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="start_date">開始{formData.all_day ? '日' : '日時'} *</label>
                        <input
                            type={formData.all_day ? "date" : "datetime-local"}
                            id="start_date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="end_date">終了{formData.all_day ? '日' : '日時'}</label>
                        <input
                            type={formData.all_day ? "date" : "datetime-local"}
                            id="end_date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="all_day"
                            name="all_day"
                            checked={formData.all_day}
                            onChange={handleChange}
                        />
                        <label htmlFor="all_day">終日</label>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="target_class">対象クラス（任意）</label>
                        <select
                            id="target_class"
                            name="target_class"
                            value={formData.target_class}
                            onChange={handleChange}
                        >
                            <option value="">全体（全員に表示）</option>
                            {classes.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                            ※選択すると、そのクラスの学生にのみ予定が表示されます。
                        </p>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="course_id">関連コース（任意）</label>
                        <select
                            id="course_id"
                            name="course_id"
                            value={formData.course_id}
                            onChange={handleChange}
                        >
                            <option value="">全体向け</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="description">説明</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="詳細説明..."
                        />
                    </div>

                    <div className={styles.modalActions}>
                        {event && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className={styles.deleteEventBtn}
                            >
                                {deleting ? '削除中...' : '削除'}
                            </button>
                        )}
                        <div className={styles.rightActions}>
                            <button
                                type="button"
                                onClick={onClose}
                                className={styles.cancelBtn}
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.title || !formData.start_date}
                                className={styles.saveBtn}
                            >
                                {loading ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
