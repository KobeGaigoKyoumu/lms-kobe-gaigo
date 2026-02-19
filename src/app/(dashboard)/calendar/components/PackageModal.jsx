'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../page.module.css'

export default function PackageModal({ pkg, onClose, onSave, userId }) {
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [formData, setFormData] = useState({
        title: pkg?.title || '',
        description: pkg?.description || '',
        events: pkg?.events || []
    })

    const handleAddEvent = () => {
        setFormData(prev => ({
            ...prev,
            events: [
                ...prev.events,
                {
                    title: '',
                    start_month: 4,
                    start_day: 1,
                    end_month: '',
                    end_day: '',
                    event_type: 'class',
                    all_day: true,
                    start_time: '',
                    end_time: '',
                    color: ''
                }
            ]
        }))
    }

    const handleEventChange = (index, field, value) => {
        setFormData(prev => {
            const newEvents = [...prev.events]
            newEvents[index] = { ...newEvents[index], [field]: value }
            return { ...prev, events: newEvents }
        })
    }

    const handleRemoveEvent = (index) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.filter((_, i) => i !== index)
        }))
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()
        const packageData = {
            title: formData.title,
            description: formData.description,
            events: formData.events,
            created_by: userId
        }

        let error
        if (pkg) {
            const { error: updateError } = await supabase
                .from('event_packages')
                .update(packageData)
                .eq('id', pkg.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('event_packages')
                .insert(packageData)
            error = insertError
        }

        if (error) {
            alert('保存に失敗しました')
            console.error(error)
            setLoading(false)
            return
        }

        onSave()
    }

    const handleDelete = async () => {
        if (!confirm('このパッケージを削除しますか？')) return

        setDeleting(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('event_packages')
            .delete()
            .eq('id', pkg.id)

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

    // Generate Month options (1-12)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    // Generate Day options (1-31)
    const days = Array.from({ length: 31 }, (_, i) => i + 1)

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
                <div className={styles.modalHeader}>
                    <h2>{pkg ? 'パッケージ編集' : '新規パッケージ'}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="title">パッケージ名 *</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="例: 年間行事予定"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="description">説明</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={2}
                            placeholder="パッケージの説明..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label>イベント一覧 ({formData.events.length}件)</label>
                            <button type="button" onClick={handleAddEvent} className={styles.addEventBtn} style={{ padding: '4px 12px', fontSize: '0.9em' }}>
                                + 追加
                            </button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '10px' }}>
                            {formData.events.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>イベントがありません。追加してください。</p>}
                            {formData.events.map((evt, index) => (
                                <div key={index} style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '10px', position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveEvent(index)}
                                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2em' }}
                                        title="削除"
                                    >×</button>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8em' }}>タイトル *</label>
                                            <input
                                                type="text"
                                                value={evt.title}
                                                onChange={e => handleEventChange(index, 'title', e.target.value)}
                                                required
                                                style={{ padding: '6px' }}
                                            />
                                        </div>

                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8em' }}>開始日 *</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <select
                                                    value={evt.start_month}
                                                    onChange={e => handleEventChange(index, 'start_month', parseInt(e.target.value))}
                                                    style={{ padding: '6px', width: '60px' }}
                                                    required
                                                >
                                                    {months.map(m => <option key={m} value={m}>{m}月</option>)}
                                                </select>
                                                <select
                                                    value={evt.start_day}
                                                    onChange={e => handleEventChange(index, 'start_day', parseInt(e.target.value))}
                                                    style={{ padding: '6px', width: '60px' }}
                                                    required
                                                >
                                                    {days.map(d => <option key={d} value={d}>{d}日</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8em' }}>終了日 (任意)</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <select
                                                    value={evt.end_month || ''}
                                                    onChange={e => handleEventChange(index, 'end_month', e.target.value ? parseInt(e.target.value) : '')}
                                                    style={{ padding: '6px', width: '60px' }}
                                                >
                                                    <option value="">-</option>
                                                    {months.map(m => <option key={m} value={m}>{m}月</option>)}
                                                </select>
                                                <select
                                                    value={evt.end_day || ''}
                                                    onChange={e => handleEventChange(index, 'end_day', e.target.value ? parseInt(e.target.value) : '')}
                                                    style={{ padding: '6px', width: '60px' }}
                                                >
                                                    <option value="">-</option>
                                                    {days.map(d => <option key={d} value={d}>{d}日</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8em' }}>種類</label>
                                            <select
                                                value={evt.event_type}
                                                onChange={e => handleEventChange(index, 'event_type', e.target.value)}
                                                style={{ padding: '6px' }}
                                            >
                                                {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>

                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.8em' }}>終日</label>
                                            <div style={{ display: 'flex', alignItems: 'center', height: '38px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={evt.all_day}
                                                    onChange={e => handleEventChange(index, 'all_day', e.target.checked)}
                                                    style={{ width: 'auto', marginRight: '8px' }}
                                                />
                                                <span style={{ fontSize: '0.9em' }}>はい</span>
                                            </div>
                                        </div>

                                        {!evt.all_day && (
                                            <>
                                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.8em' }}>開始時間</label>
                                                    <input type="time" value={evt.start_time} onChange={e => handleEventChange(index, 'start_time', e.target.value)} style={{ padding: '6px' }} />
                                                </div>
                                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.8em' }}>終了時間</label>
                                                    <input type="time" value={evt.end_time} onChange={e => handleEventChange(index, 'end_time', e.target.value)} style={{ padding: '6px' }} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.modalActions}>
                        {pkg && (
                            <button type="button" onClick={handleDelete} disabled={deleting} className={styles.deleteEventBtn}>
                                {deleting ? '削除中...' : 'パッケージ削除'}
                            </button>
                        )}
                        <div className={styles.rightActions}>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>キャンセル</button>
                            <button type="submit" disabled={loading || !formData.title || formData.events.length === 0} className={styles.saveBtn}>
                                {loading ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
