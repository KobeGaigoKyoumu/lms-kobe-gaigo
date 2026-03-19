'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function CourseScheduleManager({ courseId, classes, initialSchedules }) {
    const router = useRouter()
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        class_id: classes?.[0]?.id || '',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30',
        room: ''
    })

    const dayNames = ['日', '月', '火', '水', '木', '金', '土']

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleAddSchedule = async (e) => {
        e.preventDefault()
        if (!formData.class_id) {
            alert('クラスを選択してください')
            return
        }
        setLoading(true)

        const supabase = createClient()
        const { error } = await supabase
            .from('schedules')
            .insert({
                course_id: courseId,
                class_id: formData.class_id,
                day_of_week: parseInt(formData.day_of_week),
                start_time: formData.start_time,
                end_time: formData.end_time,
                room: formData.room || null
            })

        if (error) {
            console.error('Add schedule error:', error)
            alert('時間割の追加に失敗しました')
            setLoading(false)
            return
        }

        setFormData(prev => ({
            ...prev,
            day_of_week: 1,
            start_time: '09:00',
            end_time: '10:30',
            room: ''
        }))
        setShowAdd(false)
        setLoading(false)
        router.refresh()
    }

    const handleDeleteSchedule = async (scheduleId) => {
        if (!confirm('この時間割を削除しますか？')) return

        const supabase = createClient()
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', scheduleId)

        if (error) {
            alert('削除に失敗しました')
            return
        }

        router.refresh()
    }

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>時間割作成 ({initialSchedules?.length || 0})</h2>
                {!showAdd && (
                    <button
                        onClick={() => setShowAdd(true)}
                        className={styles.addBtn}
                    >
                        + 時間割を追加
                    </button>
                )}
            </div>

            {showAdd && (
                <form onSubmit={handleAddSchedule} className={styles.scheduleForm}>
                    <div className={styles.scheduleFormRow}>
                        <div className={styles.formGroup}>
                            <label>クラス</label>
                            <select
                                name="class_id"
                                value={formData.class_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">クラスを選択</option>
                                {classes?.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>曜日</label>
                            <select
                                name="day_of_week"
                                value={formData.day_of_week}
                                onChange={handleChange}
                            >
                                {dayNames.map((day, i) => (
                                    <option key={i} value={i}>{day}曜日</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>開始时刻</label>
                            <input
                                type="time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>終了時刻</label>
                            <input
                                type="time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>教室</label>
                            <input
                                type="text"
                                name="room"
                                value={formData.room}
                                onChange={handleChange}
                                placeholder="例: A101"
                            />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            onClick={() => setShowAdd(false)}
                            className={styles.secondaryBtn}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.submitBtn}
                        >
                            {loading ? '追加中...' : '追加'}
                        </button>
                    </div>
                </form>
            )}

            {initialSchedules?.length === 0 ? (
                <p className={styles.empty}>時間割が登録されていません</p>
            ) : (
                <div className={styles.scheduleList}>
                    {initialSchedules.map(schedule => (
                        <div key={schedule.id} className={styles.scheduleItem}>
                            <div className={styles.scheduleInfo}>
                                <span className={styles.scheduleClass}>[{schedule.class?.name}]</span>
                                <span className={styles.scheduleTime}>
                                    {dayNames[schedule.day_of_week]}曜 {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                                </span>
                                {schedule.room && <span className={styles.scheduleRoom}>({schedule.room})</span>}
                            </div>
                            <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className={styles.deleteBtn}
                                title="削除"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
