'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function ScheduleManager({ classId, schedules }) {
    const router = useRouter()
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
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
        setLoading(true)

        const supabase = createClient()
        const { error } = await supabase
            .from('schedules')
            .insert({
                class_id: classId,
                day_of_week: parseInt(formData.day_of_week),
                start_time: formData.start_time,
                end_time: formData.end_time,
                room: formData.room || null
            })

        if (error) {
            alert('時間割の追加に失敗しました')
            setLoading(false)
            return
        }

        setFormData({
            day_of_week: 1,
            start_time: '09:00',
            end_time: '10:30',
            room: ''
        })
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
        <div className={styles.managerSection}>
            {!showAdd ? (
                <button
                    onClick={() => setShowAdd(true)}
                    className={styles.addMemberBtn}
                >
                    + 時間割を追加
                </button>
            ) : (
                <form onSubmit={handleAddSchedule} className={styles.scheduleForm}>
                    <div className={styles.scheduleFormRow}>
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
                            <label>開始時刻</label>
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
                            className={styles.cancelBtn}
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

            {schedules.length > 0 && (
                <div className={styles.scheduleActions}>
                    {schedules.map(schedule => (
                        <div key={schedule.id} className={styles.scheduleAction}>
                            <span>
                                {dayNames[schedule.day_of_week]}曜 {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                                {schedule.room && ` (${schedule.room})`}
                            </span>
                            <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className={styles.removeBtn}
                            >
                                削除
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
