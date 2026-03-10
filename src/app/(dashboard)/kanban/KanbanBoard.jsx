'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import {
    addKanbanColumn, updateKanbanColumnTitle, deleteKanbanColumn, updateKanbanColumnPosition,
    addKanbanCard, updateKanbanCard, deleteKanbanCard, updateKanbanCardPosition,
    updateKanbanLabelName,
    getKanbanReminders, addKanbanReminder, updateKanbanReminder, deleteKanbanReminder
} from '@/app/actions/kanban'

const CARD_COLORS = [
    null, '#e74c3c', '#27ae60', '#f39c12', '#9b59b6',
    '#3498db', '#e67e22', '#1abc9c', '#2c3e50'
]

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function KanbanBoard({ initialColumns, initialCards, initialLabels, userId }) {
    const router = useRouter()
    const [columns, setColumns] = useState(initialColumns)
    const [cards, setCards] = useState(initialCards)
    const [labels, setLabels] = useState(initialLabels || [])

    // Edit label
    const [editingLabelId, setEditingLabelId] = useState(null)
    const [editingLabelName, setEditingLabelName] = useState('')

    // Add column
    const [addingColumn, setAddingColumn] = useState(false)
    const [newColumnTitle, setNewColumnTitle] = useState('')

    // Add card per column
    const [addingCardCol, setAddingCardCol] = useState(null)
    const [newCardTitle, setNewCardTitle] = useState('')

    // Edit column title
    const [editingColId, setEditingColId] = useState(null)
    const [editingColTitle, setEditingColTitle] = useState('')

    // Edit card modal
    const [editingCard, setEditingCard] = useState(null)

    // Reminders
    const [reminders, setReminders] = useState([])
    const [reminderCardsMap, setReminderCardsMap] = useState({}) // cardId -> has reminders
    const [showReminderForm, setShowReminderForm] = useState(false)
    const [reminderForm, setReminderForm] = useState({
        type: 'daily',
        time: '09:00',
        days: [],
        date: ''
    })
    const [editForm, setEditForm] = useState({ title: '', description: '', color: null })

    // Drag state for cards
    const dragCard = useRef(null)
    const dragOverCardId = useRef(null)

    // Drag state for columns
    const dragColumn = useRef(null)

    // All DB operations now go through Server Actions (service role)

    // ===== Column CRUD =====
    const addColumn = async () => {
        if (!newColumnTitle.trim()) return
        const maxPos = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 0
        const result = await addKanbanColumn(newColumnTitle.trim(), maxPos, userId)
        if (result.data) {
            setColumns(prev => [...prev, result.data])
        }
        setNewColumnTitle('')
        setAddingColumn(false)
    }

    const updateColumnTitle = async (colId) => {
        if (!editingColTitle.trim()) { setEditingColId(null); return }
        await updateKanbanColumnTitle(colId, editingColTitle.trim())
        setColumns(prev => prev.map(c => c.id === colId ? { ...c, title: editingColTitle.trim() } : c))
        setEditingColId(null)
    }

    const deleteColumn = async (colId) => {
        const colCards = cards.filter(c => c.column_id === colId)
        if (colCards.length > 0) {
            if (!confirm('このカラムにはカードがあります。カラムごと削除しますか？')) return
        } else {
            if (!confirm('このカラムを削除しますか？')) return
        }
        await deleteKanbanColumn(colId)
        setColumns(prev => prev.filter(c => c.id !== colId))
        setCards(prev => prev.filter(c => c.column_id !== colId))
    }

    // ===== Card CRUD =====
    const addCard = async (columnId) => {
        if (!newCardTitle.trim()) return
        const colCards = cards.filter(c => c.column_id === columnId)
        const maxPos = colCards.length > 0 ? Math.max(...colCards.map(c => c.position)) + 1 : 0
        const result = await addKanbanCard(columnId, newCardTitle.trim(), maxPos, userId)
        if (result.data) {
            setCards(prev => [...prev, result.data])
        }
        setNewCardTitle('')
        setAddingCardCol(null)
    }

    const updateCard = async () => {
        if (!editingCard || !editForm.title.trim()) return
        const result = await updateKanbanCard(editingCard.id, {
            title: editForm.title.trim(),
            description: editForm.description || null,
            color: editForm.color
        })
        if (!result.error) {
            setCards(prev => prev.map(c =>
                c.id === editingCard.id
                    ? { ...c, title: editForm.title.trim(), description: editForm.description || null, color: editForm.color }
                    : c
            ))
        }
        setEditingCard(null)
    }

    const deleteCard = async (cardId) => {
        await deleteKanbanCard(cardId)
        setCards(prev => prev.filter(c => c.id !== cardId))
        setEditingCard(null)
    }

    // ===== Label CRUD =====
    const updateLabelNameFn = async (labelId) => {
        if (!editingLabelName.trim()) { setEditingLabelId(null); return }
        const newName = editingLabelName.trim()
        await updateKanbanLabelName(labelId, newName)
        setLabels(prev => prev.map(l => l.id === labelId ? { ...l, name: newName } : l))
        setEditingLabelId(null)
    }

    // ===== Card Drag & Drop (cross-column + intra-column reorder) =====
    const handleDragStart = useCallback((e, card) => {
        dragCard.current = card
        dragColumn.current = null
        e.dataTransfer.effectAllowed = 'move'
        e.target.classList.add(styles.cardDragging)
    }, [])

    const handleDragEnd = useCallback((e) => {
        e.target.classList.remove(styles.cardDragging)
        dragCard.current = null
        dragOverCardId.current = null
        // Clean up drop indicators
        document.querySelectorAll(`.${styles.cardDropBefore}, .${styles.cardDropAfter}`).forEach(el => {
            el.classList.remove(styles.cardDropBefore)
            el.classList.remove(styles.cardDropAfter)
        })
    }, [])

    const handleCardDragOver = useCallback((e, card) => {
        if (!dragCard.current || dragColumn.current) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'

        // Determine if we're in the top or bottom half
        const rect = e.currentTarget.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        const isAbove = e.clientY < midY

        // Clean old indicators
        document.querySelectorAll(`.${styles.cardDropBefore}, .${styles.cardDropAfter}`).forEach(el => {
            el.classList.remove(styles.cardDropBefore)
            el.classList.remove(styles.cardDropAfter)
        })

        if (isAbove) {
            e.currentTarget.classList.add(styles.cardDropBefore)
        } else {
            e.currentTarget.classList.add(styles.cardDropAfter)
        }

        dragOverCardId.current = { id: card.id, above: isAbove }
    }, [])

    const handleColumnAreaDragOver = useCallback((e) => {
        if (!dragCard.current || dragColumn.current) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const handleCardDrop = useCallback(async (e, targetColumnId) => {
        e.preventDefault()
        if (dragColumn.current) return

        const card = dragCard.current
        if (!card) return

        // Clean up drop indicators
        document.querySelectorAll(`.${styles.cardDropBefore}, .${styles.cardDropAfter}`).forEach(el => {
            el.classList.remove(styles.cardDropBefore)
            el.classList.remove(styles.cardDropAfter)
        })

        const overInfo = dragOverCardId.current
        const colCards = cards
            .filter(c => c.column_id === targetColumnId && c.id !== card.id)
            .sort((a, b) => a.position - b.position)

        let newPosition
        if (overInfo) {
            const targetIdx = colCards.findIndex(c => c.id === overInfo.id)
            if (targetIdx >= 0) {
                if (overInfo.above) {
                    // Insert before
                    newPosition = targetIdx > 0
                        ? (colCards[targetIdx - 1].position + colCards[targetIdx].position) / 2
                        : colCards[targetIdx].position - 1
                } else {
                    // Insert after
                    newPosition = targetIdx < colCards.length - 1
                        ? (colCards[targetIdx].position + colCards[targetIdx + 1].position) / 2
                        : colCards[targetIdx].position + 1
                }
            } else {
                newPosition = colCards.length > 0 ? colCards[colCards.length - 1].position + 1 : 0
            }
        } else {
            // Dropped on empty area
            newPosition = colCards.length > 0 ? colCards[colCards.length - 1].position + 1 : 0
        }

        // Optimistic update
        setCards(prev => prev.map(c =>
            c.id === card.id ? { ...c, column_id: targetColumnId, position: newPosition } : c
        ))

        // Persist
        await updateKanbanCardPosition(card.id, targetColumnId, newPosition)

        dragCard.current = null
        dragOverCardId.current = null
    }, [cards])

    // ===== Column Drag & Drop =====
    const handleColumnDragStart = useCallback((e, column) => {
        dragColumn.current = column
        dragCard.current = null
        e.dataTransfer.effectAllowed = 'move'
        const colEl = e.target.closest(`.${styles.column}`)
        if (colEl) colEl.classList.add(styles.columnDragging)
    }, [])

    const handleColumnDragEnd = useCallback((e) => {
        const colEl = e.target.closest(`.${styles.column}`)
        if (colEl) colEl.classList.remove(styles.columnDragging)
        dragColumn.current = null
        document.querySelectorAll(`.${styles.columnDragOver}`).forEach(el => el.classList.remove(styles.columnDragOver))
    }, [])

    const handleColumnDragOver = useCallback((e) => {
        if (!dragColumn.current) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const handleColumnDragEnter = useCallback((e, column) => {
        if (!dragColumn.current) return
        e.preventDefault()
        const colEl = e.currentTarget.closest(`.${styles.column}`)
        if (colEl) {
            document.querySelectorAll(`.${styles.columnDragOver}`).forEach(el => el.classList.remove(styles.columnDragOver))
            colEl.classList.add(styles.columnDragOver)
        }
    }, [])

    const handleColumnDrop = useCallback(async (e, targetColumn) => {
        e.preventDefault()
        e.stopPropagation()
        const sourceColumn = dragColumn.current
        if (!sourceColumn || sourceColumn.id === targetColumn.id) {
            dragColumn.current = null
            return
        }

        const newColumns = columns.map(c => {
            if (c.id === sourceColumn.id) return { ...c, position: targetColumn.position }
            if (c.id === targetColumn.id) return { ...c, position: sourceColumn.position }
            return c
        }).sort((a, b) => a.position - b.position)

        setColumns(newColumns)

        await Promise.all([
            updateKanbanColumnPosition(sourceColumn.id, targetColumn.position),
            updateKanbanColumnPosition(targetColumn.id, sourceColumn.position)
        ])

        dragColumn.current = null
        document.querySelectorAll(`.${styles.columnDragOver}`).forEach(el => el.classList.remove(styles.columnDragOver))
    }, [columns])

    const openEditModal = async (card) => {
        setEditingCard(card)
        setEditForm({
            title: card.title,
            description: card.description || '',
            color: card.color || null
        })
        setShowReminderForm(false)
        setReminderForm({ type: 'daily', time: '09:00', days: [], date: '' })
        // Load reminders for this card
        const result = await getKanbanReminders(card.id)
        setReminders(result.data || [])
    }

    const handleAddReminder = async () => {
        if (!editingCard) return
        const result = await addKanbanReminder(
            editingCard.id,
            reminderForm.type,
            reminderForm.time,
            reminderForm.type === 'weekly' ? reminderForm.days : [],
            reminderForm.type === 'once' ? reminderForm.date : null,
            userId
        )
        if (result.data) {
            setReminders(prev => [...prev, result.data])
            setReminderCardsMap(prev => ({ ...prev, [editingCard.id]: true }))
        }
        setShowReminderForm(false)
        setReminderForm({ type: 'daily', time: '09:00', days: [], date: '' })
    }

    const handleToggleReminder = async (reminderId, currentEnabled) => {
        await updateKanbanReminder(reminderId, { enabled: !currentEnabled })
        setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, enabled: !currentEnabled } : r))
    }

    const handleDeleteReminder = async (reminderId) => {
        await deleteKanbanReminder(reminderId)
        setReminders(prev => prev.filter(r => r.id !== reminderId))
        // Update map if no more reminders
        if (editingCard) {
            const remaining = reminders.filter(r => r.id !== reminderId)
            if (remaining.length === 0) {
                setReminderCardsMap(prev => {
                    const next = { ...prev }
                    delete next[editingCard.id]
                    return next
                })
            }
        }
    }

    const toggleDay = (day) => {
        setReminderForm(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day].sort()
        }))
    }

    const formatReminderInfo = (r) => {
        const time = r.remind_time?.substring(0, 5) || ''
        switch (r.reminder_type) {
            case 'daily': return `毎日 ${time}`
            case 'weekly': {
                const dayStr = (r.remind_days || []).map(d => DAY_LABELS[d]).join(', ')
                return `毎週 ${dayStr} ${time}`
            }
            case 'once': return `${r.remind_date || ''} ${time}`
            default: return time
        }
    }

    // Load reminder badge info on mount
    useEffect(() => {
        const loadReminderBadges = async () => {
            const map = {}
            for (const card of initialCards) {
                const result = await getKanbanReminders(card.id)
                if (result.data && result.data.length > 0) {
                    map[card.id] = true
                }
            }
            setReminderCardsMap(map)
        }
        if (initialCards.length > 0) loadReminderBadges()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <div className={styles.board}>
                {columns.map(col => {
                    const colCards = cards
                        .filter(c => c.column_id === col.id)
                        .sort((a, b) => a.position - b.position)
                    return (
                        <div
                            key={col.id}
                            className={styles.column}
                            onDragOver={handleColumnDragOver}
                            onDragEnter={(e) => handleColumnDragEnter(e, col)}
                            onDrop={(e) => {
                                if (dragColumn.current) {
                                    handleColumnDrop(e, col)
                                } else {
                                    handleCardDrop(e, col.id)
                                }
                            }}
                        >
                            {/* Column Header */}
                            <div className={styles.columnHeader}>
                                <span
                                    className={styles.columnDragHandle}
                                    draggable
                                    onDragStart={(e) => handleColumnDragStart(e, col)}
                                    onDragEnd={handleColumnDragEnd}
                                    title="ドラッグして並び替え"
                                >⋮⋮</span>
                                {editingColId === col.id ? (
                                    <input
                                        className={styles.columnTitleInput}
                                        value={editingColTitle}
                                        onChange={e => setEditingColTitle(e.target.value)}
                                        onBlur={() => updateColumnTitle(col.id)}
                                        onKeyDown={e => { if (e.key === 'Enter') updateColumnTitle(col.id) }}
                                        autoFocus
                                    />
                                ) : (
                                    <h3
                                        className={styles.columnTitle}
                                        onClick={() => { setEditingColId(col.id); setEditingColTitle(col.title) }}
                                    >
                                        {col.title}
                                    </h3>
                                )}
                                <span className={styles.columnCount}>{colCards.length}</span>
                                <div className={styles.columnActions}>
                                    <button
                                        className={styles.columnAddBtn}
                                        onClick={() => { setAddingCardCol(col.id); setNewCardTitle('') }}
                                        title="カード追加"
                                    >+</button>
                                    <button
                                        className={styles.columnDeleteBtn}
                                        onClick={() => deleteColumn(col.id)}
                                        title="カラム削除"
                                    >✕</button>
                                </div>
                            </div>

                            {/* Card List */}
                            <div
                                className={styles.cardList}
                                onDragOver={handleColumnAreaDragOver}
                                onDrop={(e) => handleCardDrop(e, col.id)}
                            >
                                {colCards.map(card => (
                                    <div
                                        key={card.id}
                                        className={styles.card}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, card)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleCardDragOver(e, card)}
                                        onClick={() => openEditModal(card)}
                                    >
                                        {card.color && (
                                            <div className={styles.cardColorBar} style={{ background: card.color }} />
                                        )}
                                        <div className={styles.cardTitle}>{card.title}</div>
                                        {card.description && (
                                            <div className={styles.cardDescription}>{card.description}</div>
                                        )}
                                        {reminderCardsMap[card.id] && (
                                            <span className={styles.reminderBadge} title="リマインダー設定済み">🔔</span>
                                        )}
                                        <button
                                            className={styles.cardDeleteBtn}
                                            onClick={(e) => { e.stopPropagation(); deleteCard(card.id) }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Card Form */}
                            {addingCardCol === col.id && (
                                <div className={styles.addCardForm}>
                                    <input
                                        className={styles.addCardInput}
                                        placeholder="カードタイトル..."
                                        value={newCardTitle}
                                        onChange={e => setNewCardTitle(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') addCard(col.id) }}
                                        autoFocus
                                    />
                                    <div className={styles.addCardActions}>
                                        <button className={styles.addCardSubmit} onClick={() => addCard(col.id)}>追加</button>
                                        <button className={styles.addCardCancel} onClick={() => setAddingCardCol(null)}>キャンセル</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Add Column */}
                <div className={styles.addColumn}>
                    {addingColumn ? (
                        <div className={styles.addColumnForm}>
                            <input
                                className={styles.addColumnInput}
                                placeholder="カラム名..."
                                value={newColumnTitle}
                                onChange={e => setNewColumnTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addColumn() }}
                                autoFocus
                            />
                            <div className={styles.addColumnActions}>
                                <button className={styles.addCardSubmit} onClick={addColumn}>追加</button>
                                <button className={styles.addCardCancel} onClick={() => setAddingColumn(false)}>キャンセル</button>
                            </div>
                        </div>
                    ) : (
                        <button className={styles.addColumnBtn} onClick={() => setAddingColumn(true)}>
                            + カラムを追加
                        </button>
                    )}
                </div>
            </div>

            {/* Label Color Bar */}
            <div className={styles.labelBar}>
                {labels.map((lbl) => (
                    <div
                        key={lbl.id}
                        className={styles.labelBarItem}
                        style={{ background: lbl.color }}
                        onClick={() => { setEditingLabelId(lbl.id); setEditingLabelName(lbl.name) }}
                    >
                        {editingLabelId === lbl.id ? (
                            <input
                                autoFocus
                                className={styles.labelEditInput}
                                value={editingLabelName}
                                onChange={e => setEditingLabelName(e.target.value)}
                                onBlur={() => updateLabelNameFn(lbl.id)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') updateLabelNameFn(lbl.id)
                                    if (e.key === 'Escape') setEditingLabelId(null)
                                }}
                            />
                        ) : (
                            lbl.name
                        )}
                    </div>
                ))}
            </div>

            {/* Edit Card Modal */}
            {editingCard && (
                <div className={styles.modalOverlay} onClick={() => setEditingCard(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>カード編集</h2>
                            <button className={styles.closeBtn} onClick={() => setEditingCard(null)}>✕</button>
                        </div>
                        <div className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label>タイトル</label>
                                <input
                                    value={editForm.title}
                                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>説明</label>
                                <textarea
                                    rows={3}
                                    value={editForm.description}
                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>色</label>
                                <div className={styles.modalColorPicker}>
                                    {CARD_COLORS.map((c, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.colorSwatch} ${editForm.color === c ? styles.colorSwatchActive : ''}`}
                                            style={{ background: c || '#eee' }}
                                            onClick={() => setEditForm(prev => ({ ...prev, color: c }))}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Reminder Section */}
                        <div className={styles.reminderSection}>
                            <div className={styles.reminderHeader}>
                                <h3>🔔 リマインダー</h3>
                                <button
                                    className={styles.reminderAddBtn}
                                    onClick={() => setShowReminderForm(!showReminderForm)}
                                >{showReminderForm ? 'キャンセル' : '+ 追加'}</button>
                            </div>

                            {showReminderForm && (
                                <div className={styles.reminderForm}>
                                    <div className={styles.reminderFormRow}>
                                        <label>タイプ</label>
                                        <select
                                            value={reminderForm.type}
                                            onChange={e => setReminderForm(prev => ({ ...prev, type: e.target.value }))}
                                        >
                                            <option value="daily">毎日</option>
                                            <option value="weekly">曜日指定</option>
                                            <option value="once">一回限り</option>
                                        </select>
                                    </div>
                                    <div className={styles.reminderFormRow}>
                                        <label>時間</label>
                                        <input
                                            type="time"
                                            value={reminderForm.time}
                                            onChange={e => setReminderForm(prev => ({ ...prev, time: e.target.value }))}
                                        />
                                    </div>
                                    {reminderForm.type === 'weekly' && (
                                        <div className={styles.reminderFormRow}>
                                            <label>曜日</label>
                                            <div className={styles.dayPicker}>
                                                {DAY_LABELS.map((label, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className={`${styles.dayBtn} ${reminderForm.days.includes(i) ? styles.dayBtnActive : ''}`}
                                                        onClick={() => toggleDay(i)}
                                                    >{label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {reminderForm.type === 'once' && (
                                        <div className={styles.reminderFormRow}>
                                            <label>日付</label>
                                            <input
                                                type="date"
                                                value={reminderForm.date}
                                                onChange={e => setReminderForm(prev => ({ ...prev, date: e.target.value }))}
                                            />
                                        </div>
                                    )}
                                    <button className={styles.reminderSubmitBtn} onClick={handleAddReminder}>
                                        リマインダーを追加
                                    </button>
                                </div>
                            )}

                            {reminders.length > 0 ? (
                                <div className={styles.reminderList}>
                                    {reminders.map(r => (
                                        <div key={r.id} className={`${styles.reminderItem} ${!r.enabled ? styles.reminderDisabled : ''}`}>
                                            <div className={styles.reminderInfo}>
                                                <span className={styles.reminderTypeTag}>
                                                    {r.reminder_type === 'daily' ? '毎日' : r.reminder_type === 'weekly' ? '週次' : '一回'}
                                                </span>
                                                <span className={styles.reminderTime}>{formatReminderInfo(r)}</span>
                                            </div>
                                            <div className={styles.reminderActions}>
                                                <button
                                                    className={`${styles.reminderToggle} ${r.enabled ? styles.reminderToggleOn : ''}`}
                                                    onClick={() => handleToggleReminder(r.id, r.enabled)}
                                                    title={r.enabled ? 'オフにする' : 'オンにする'}
                                                >{r.enabled ? 'ON' : 'OFF'}</button>
                                                <button
                                                    className={styles.reminderDeleteBtn}
                                                    onClick={() => handleDeleteReminder(r.id)}
                                                    title="削除"
                                                >✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.reminderEmpty}>リマインダーはまだ設定されていません</p>
                            )}
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.deleteBtn} onClick={() => deleteCard(editingCard.id)}>削除</button>
                            <button className={styles.cancelBtn} onClick={() => setEditingCard(null)}>キャンセル</button>
                            <button className={styles.saveBtn} onClick={updateCard}>保存</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
