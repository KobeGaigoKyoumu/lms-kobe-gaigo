'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    saveScheduleTemplateAction,
    deleteScheduleTemplateAction,
    copyScheduleTemplateAction,
    applyScheduleTemplateAction,
    deleteClassScheduleAction
} from '@/app/actions/scheduleTemplateActions'
import styles from './page.module.css'

const SHIFT_TIMES = {
    morning: {
        1: { start: '09:00', end: '09:45' },
        2: { start: '09:50', end: '10:35' },
        3: { start: '10:50', end: '11:35' },
        4: { start: '11:40', end: '12:25' }
    },
    afternoon: {
        1: { start: '13:10', end: '13:55' },
        2: { start: '14:00', end: '14:45' },
        3: { start: '15:00', end: '15:45' },
        4: { start: '15:50', end: '16:35' }
    }
}

const DAY_NAMES = ['月', '火', '水', '木', '金']
const DAYS_OFFSET = 1 // 1=月曜日, ..., 5=金曜日

export default function CourseScheduleManager({ courseId, classes, initialSchedules, initialTemplates }) {
    const router = useRouter()
    
    // UI states
    const [activeTab, setActiveTab] = useState('templates') // 'templates' | 'classes'
    const [loading, setLoading] = useState(false)
    
    // Class Schedules State
    const [selectedClassId, setSelectedClassId] = useState(classes?.[0]?.id || '')
    const [showApplyModal, setShowApplyModal] = useState(false)
    const [applyConfig, setApplyConfig] = useState({ template_id: '', shift: 'morning' })

    // Template Editor State
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [templateName, setTemplateName] = useState('')
    // templateGrid[day][period] = subject (day: 1-5, period: 1-4)
    const [templateGrid, setTemplateGrid] = useState({})

    // Helpers
    const classSchedules = initialSchedules.filter(s => s.class_id === selectedClassId).map(s => {
        if (!s.period && s.start_time) {
            // infer period from start_time
            if (s.start_time.startsWith('09:00') || s.start_time.startsWith('13:10')) s.period = 1;
            else if (s.start_time.startsWith('09:50') || s.start_time.startsWith('14:00')) s.period = 2;
            else if (s.start_time.startsWith('10:50') || s.start_time.startsWith('15:00')) s.period = 3;
            else if (s.start_time.startsWith('11:40') || s.start_time.startsWith('15:50')) s.period = 4;
        }
        return s;
    })

    // --- Template Editing ---
    const initGrid = () => {
        const grid = {}
        for (let day = 1; day <= 5; day++) {
            grid[day] = {}
            for (let period = 1; period <= 4; period++) {
                grid[day][period] = ''
            }
        }
        return grid
    }

    const openCreateTemplate = () => {
        setEditingTemplate('new')
        setTemplateName('')
        setTemplateGrid(initGrid())
    }

    const openEditTemplate = (template) => {
        setEditingTemplate(template.id)
        setTemplateName(template.name)
        const grid = initGrid()
        template.items?.forEach(item => {
            if (grid[item.day_of_week]) {
                grid[item.day_of_week][item.period] = item.subject
            }
        })
        setTemplateGrid(grid)
    }

    const handleGridChange = (day, period, value) => {
        setTemplateGrid(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [period]: value
            }
        }))
    }

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            alert('テンプレート名を入力してください')
            return
        }

        setLoading(true)

        try {
            const newItems = []
            for (let day = 1; day <= 5; day++) {
                for (let period = 1; period <= 4; period++) {
                    const subject = templateGrid[day]?.[period]
                    if (subject?.trim()) {
                        newItems.push({
                            day_of_week: day,
                            period: period,
                            subject: subject.trim()
                        })
                    }
                }
            }

            await saveScheduleTemplateAction(courseId, templateName, editingTemplate, newItems)

            setEditingTemplate(null)
            router.refresh()
        } catch (error) {
            console.error('Save template error:', error)
            alert('テンプレートの保存に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm('このテンプレートを削除しますか？')) return
        await deleteScheduleTemplateAction(courseId, templateId)
        router.refresh()
    }

    const handleCopyTemplate = async (template) => {
        setLoading(true)
        try {
            await copyScheduleTemplateAction(courseId, template)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('コピーに失敗しました')
        } finally {
            setLoading(false)
        }
    }

    // --- Applying Templates ---
    const handleApplyTemplate = async () => {
        if (!applyConfig.template_id) {
            alert('テンプレートを選択してください')
            return
        }

        const template = initialTemplates.find(t => t.id === applyConfig.template_id)
        if (!template) return

        if (!confirm(`「${template.name}」をクラス適用しますか？現在の時間割は上書きされます。`)) return

        setLoading(true)

        try {
            await applyScheduleTemplateAction(courseId, selectedClassId, template, applyConfig.shift)
            setShowApplyModal(false)
            router.refresh()
        } catch (error) {
            console.error('Apply template error:', error)
            alert('テンプレートの適用に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClassSchedule = async (scheduleId) => {
        if (!confirm('このコマを削除しますか？')) return
        await deleteClassScheduleAction(courseId, scheduleId)
        router.refresh()
    }

    // --- Renderers ---
    const renderGrid = (gridData, isEditing = false, onCellChange = null, onDeleteCell = null) => {
        return (
            <div className={styles.scheduleGrid}>
                {/* Header: Days */}
                <div className={styles.gridHeaderRow}>
                    <div className={styles.gridCorner}>時間 \ 曜日</div>
                    {DAY_NAMES.map((dayName) => (
                        <div key={dayName} className={styles.gridHeaderCell}>{dayName}</div>
                    ))}
                </div>
                {/* Body: Periods */}
                {[1, 2, 3, 4].map(period => {
                    return (
                        <div key={period} className={styles.gridRow}>
                            <div className={styles.gridSideCell}>{period}限</div>
                            {DAY_NAMES.map((_, dayIndex) => {
                                const dayNum = dayIndex + 1
                                const subject = isEditing ? gridData[dayNum]?.[period] : gridData.find(s => s.day_of_week === dayNum && s.period === period)
                                return (
                                    <div key={dayNum} className={styles.gridDataCell}>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={subject || ''}
                                                onChange={(e) => onCellChange(dayNum, period, e.target.value)}
                                                placeholder="科目名"
                                                className={styles.gridInput}
                                            />
                                        ) : (
                                            subject ? (
                                                <div className={styles.slotContent}>
                                                    <span className={styles.slotSubject}>{subject.subject}</span>
                                                    {subject.start_time && (
                                                        <span className={styles.slotTime}>{subject.start_time.slice(0,5)}~{subject.end_time.slice(0,5)}</span>
                                                    )}
                                                    {subject.room && (
                                                        <span className={styles.slotRoom}>{subject.room}</span>
                                                    )}
                                                    {onDeleteCell && (
                                                        <button className={styles.slotDeleteBtn} onClick={() => onDeleteCell(subject.id)} title="削除">×</button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={styles.emptySlot}>-</span>
                                            )
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <section className={styles.section}>
            <div className={styles.managerHeader}>
                <h2>時間割プレビュー / テンプレート管理</h2>
                <div className={styles.modeTabs}>
                    <button
                        className={`${styles.modeTab} ${activeTab === 'templates' ? styles.active : ''}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        テンプレート管理
                    </button>
                    <button
                        className={`${styles.modeTab} ${activeTab === 'classes' ? styles.active : ''}`}
                        onClick={() => setActiveTab('classes')}
                    >
                        クラス別時間割
                    </button>
                </div>
            </div>

            <div className={styles.managerBody}>
                {/* --- TEMPLATES TAB --- */}
                {activeTab === 'templates' && (
                    <div className={styles.tabContent}>
                        {editingTemplate ? (
                            <div className={styles.editorPanel}>
                                <div className={styles.editorHeader}>
                                    <input 
                                        type="text" 
                                        value={templateName} 
                                        onChange={e => setTemplateName(e.target.value)} 
                                        placeholder="テンプレート名 (例: 初級 1)" 
                                        className={styles.nameInput}
                                    />
                                    <div className={styles.formActions}>
                                        <button onClick={() => setEditingTemplate(null)} className={styles.secondaryBtn}>キャンセル</button>
                                        <button onClick={handleSaveTemplate} disabled={loading} className={styles.primaryBtn}>{loading ? '保存中...' : '保存'}</button>
                                    </div>
                                </div>
                                <div className={styles.editorBody}>
                                    {renderGrid(templateGrid, true, handleGridChange)}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.actionRow}>
                                    <button onClick={openCreateTemplate} className={styles.addBtn}>+ テンプレート作成</button>
                                </div>
                                {initialTemplates.length === 0 ? (
                                    <p className={styles.empty}>テンプレートがありません</p>
                                ) : (
                                    <div className={styles.templateList}>
                                        {initialTemplates.map(template => (
                                            <div key={template.id} className={styles.templateCard}>
                                                <div className={styles.templateInfo}>
                                                    <h3>{template.name}</h3>
                                                    <p>{template.items?.length || 0} コマ設定済み</p>
                                                </div>
                                                <div className={styles.templateActions}>
                                                    <button onClick={() => openEditTemplate(template)} className={styles.iconBtn}>編集</button>
                                                    <button onClick={() => handleCopyTemplate(template)} disabled={loading} className={styles.iconBtn}>複製</button>
                                                    <button onClick={() => handleDeleteTemplate(template.id)} className={styles.iconBtnDanger}>削除</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* --- CLASSES TAB --- */}
                {activeTab === 'classes' && (
                    <div className={styles.tabContent}>
                        <div className={styles.classSelectorRow}>
                            <select 
                                value={selectedClassId} 
                                onChange={e => setSelectedClassId(e.target.value)}
                                className={styles.classSelect}
                            >
                                {classes?.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                            
                            <button onClick={() => setShowApplyModal(true)} disabled={!selectedClassId || initialTemplates.length === 0} className={styles.actionBtn}>
                                テンプレートを適用
                            </button>
                        </div>

                        {showApplyModal && (
                            <div className={styles.applyModal}>
                                <h3>テンプレートを適用する</h3>
                                <p className={styles.warningText}>※現在の時間割は上書きされます。教室の設定は後から個別に行う必要があります。</p>
                                
                                <div className={styles.formGroup}>
                                    <label>テンプレート選択</label>
                                    <select value={applyConfig.template_id} onChange={e => setApplyConfig({...applyConfig, template_id: e.target.value})}>
                                        <option value="">-- 選択してください --</option>
                                        {initialTemplates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>シフト（時間帯）</label>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input type="radio" name="shift" value="morning" checked={applyConfig.shift === 'morning'} onChange={e => setApplyConfig({...applyConfig, shift: e.target.value})} />
                                            午前 (1限: 09:00~)
                                        </label>
                                        <label>
                                            <input type="radio" name="shift" value="afternoon" checked={applyConfig.shift === 'afternoon'} onChange={e => setApplyConfig({...applyConfig, shift: e.target.value})} />
                                            午後 (1限: 13:10~)
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.formActions}>
                                    <button onClick={() => setShowApplyModal(false)} className={styles.secondaryBtn}>キャンセル</button>
                                    <button onClick={handleApplyTemplate} disabled={loading || !applyConfig.template_id} className={styles.primaryBtn}>
                                        {loading ? '適用中...' : '適用する'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className={styles.scheduleViewer}>
                            {renderGrid(classSchedules, false, null, handleDeleteClassSchedule)}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
