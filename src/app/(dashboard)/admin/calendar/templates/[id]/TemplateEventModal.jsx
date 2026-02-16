'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/(dashboard)/calendar/page.module.css' // Reuse styles

export default function TemplateEventModal({ event, date, templateId, onClose, onSave }) {
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        all_day: true,
        event_type: 'other',
        color: ''
    })

    useEffect(() => {
        // Initialize form
        if (event) {
            setFormData({
                title: event.title || '',
                description: event.description || '',
                start_date: formatDateTimeLocal(new Date(event.date)),
                end_date: event.endDate ? formatDateTimeLocal(new Date(event.endDate)) : '',
                all_day: event.allDay !== false,
                event_type: event.type || 'other',
                color: event.color || ''
            })
        } else if (date) {
            setFormData(prev => ({
                ...prev,
                start_date: formatDateTimeLocal(date)
            }))
        }
    }, [event, date])

    const formatDateTimeLocal = (date) => {
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        const eventData = {
            template_id: templateId,
            title: formData.title,
            description: formData.description || null,
            start_date: new Date(formData.start_date).toISOString(),
            end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
            all_day: formData.all_day,
            event_type: formData.event_type,
            color: formData.color || null
        }

        let error
        if (event) {
            const { error: updateError } = await supabase
                .from('calendar_template_events')
                .update(eventData)
                .eq('id', event.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('calendar_template_events')
                .insert(eventData)
            error = insertError
        }

        if (error) {
            alert('保存に失敗しました')
            console.error(error)
        } else {
            onSave()
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!confirm('削除しますか？')) return
        setDeleting(true)
        const supabase = createClient()
        const { error } = await supabase
            .from('calendar_template_events')
            .delete()
            .eq('id', event.id)

        if (error) {
            alert('削除に失敗しました')
        } else {
            onSave()
        }
        setDeleting(false)
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

    // Simplified styles for modal
    const modalStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }
    const contentStyle = {
        backgroundColor: 'white', padding: '2rem', borderRadius: '8px', minWidth: '400px', maxWidth: '90%'
    }

    return (
        <div style={modalStyle} onClick={onClose}>
            <div style={contentStyle} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: '1rem' }}>{event ? 'イベント編集' : '新規イベント'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label>タイトル</label>
                        <input name="title" value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div>
                            <label>種類</label>
                            <select name="event_type" value={formData.event_type} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                                {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label>色</label>
                            <select name="color" value={formData.color} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                                <option value="">自動</option>
                                {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label>開始日時</label>
                        <input type="datetime-local" name="start_date" value={formData.start_date} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
                    </div>
                    <div>
                        <label>終了日時</label>
                        <input type="datetime-local" name="end_date" value={formData.end_date} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                    </div>
                    <div>
                        <input type="checkbox" id="all_day_tmpl" name="all_day" checked={formData.all_day} onChange={handleChange} />
                        <label htmlFor="all_day_tmpl" style={{ marginLeft: '8px' }}>終日</label>
                    </div>
                    <div>
                        <label>説明</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: '8px' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                        {event && <button type="button" onClick={handleDelete} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>削除</button>}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={onClose} style={{ padding: '8px 16px' }}>キャンセル</button>
                            <button type="submit" disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>{loading ? '保存中' : '保存'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
