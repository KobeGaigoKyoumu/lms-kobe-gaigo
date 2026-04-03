'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { 
    addKanbanColumn, 
    updateKanbanColumnTitle, 
    deleteKanbanColumn,
    addKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
    updateKanbanCardPosition,
    updateKanbanColumnPosition,
    updateKanbanLabelName,
    addKanbanReminder,
    updateKanbanReminder,
    deleteKanbanReminder,
    getKanbanReminders,
    getKanbanColumns,
    getKanbanCards,
    getKanbanLabels,
    getAllKanbanReminders
} from '@/app/actions/kanban'

const CARD_COLORS = [
    null, '#e74c3c', '#27ae60', '#f39c12', '#9b59b6',
    '#3498db', '#e67e22', '#1abc9c', '#2c3e50'
]

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function KanbanBoard({ initialColumns, initialCards, initialLabels, initialReminders, userId, userName }) {
    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(!initialColumns)
    const [error, setError] = useState(null)
    const [columns, setColumns] = useState(initialColumns || [])
    const [cards, setCards] = useState(initialCards || [])
    const [labels, setLabels] = useState(initialLabels || [])
    const [expandedCards, setExpandedCards] = useState(new Set())

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
    const [editingReminderId, setEditingReminderId] = useState(null)
    const [editForm, setEditForm] = useState({ title: '', description: '', color: null })

    // Drag state for cards
    const dragCard = useRef(null)
    const dragOverCardId = useRef(null)

    // Drag state for columns
    const dragColumn = useRef(null)

    useEffect(() => {
        const fetchBoardData = async () => {
            setIsLoading(true)
            setError(null)
            try {
                // Use Server Actions to fetch data as they have proper DB access (bypassing RLS issues for client-side fetching)
                const [
                    { data: colData, error: colError },
                    { data: cardData, error: cardError },
                    { data: labelData, error: labelError },
                    { data: reminderData, error: reminderError }
                ] = await Promise.all([
                    getKanbanColumns(),
                    getKanbanCards(),
                    getKanbanLabels(),
                    getAllKanbanReminders()
                ])

                if (colError || cardError || labelError || reminderError) {
                    throw new Error(colError || cardError || labelError || reminderError)
                }

                if (colData) setColumns(colData)
                if (cardData) setCards(cardData)
                if (labelData) setLabels(labelData)
                
                if (reminderData) {
                    const map = {}
                    for (const r of reminderData) {
                        map[r.card_id] = true
                    }
                    setReminderCardsMap(map)
                }
            } catch (err) {
                console.error('Failed to fetch Kanban data:', err)
                setError('データの読み込みに失敗しました。再読み込みしてください。')
            } finally {
                setIsLoading(false)
            }
        }
        
        if (initialColumns) {
            setColumns(initialColumns)
            setCards(initialCards || [])
            setLabels(initialLabels || [])
            setIsLoading(false)
        } else {
            fetchBoardData()
        }
    }, [initialColumns, initialCards, initialLabels])

    // Direct DB operations via Supabase client

    // ===== Column CRUD =====
    const addColumn = async () => {
        if (!newColumnTitle.trim()) return
        const maxPos = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 0
        const { data, error } = await addKanbanColumn(newColumnTitle.trim(), maxPos, userId)
        if (data) {
            setColumns(prev => [...prev, data])
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
        setNewColumnTitle('')
        setAddingColumn(false)
    }

    const updateColumnTitle = async (colId) => {
        if (!editingColTitle.trim()) { setEditingColId(null); return }
        const newTitle = editingColTitle.trim()
        const { success, error } = await updateKanbanColumnTitle(colId, newTitle)
        if (success) {
            setColumns(prev => prev.map(c => c.id === colId ? { ...c, title: newTitle } : c))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
        setEditingColId(null)
    }

    const deleteColumn = async (colId) => {
        const colCards = cards.filter(c => c.column_id === colId)
        if (colCards.length > 0) {
            if (!confirm('このカラムにはカードがあります。カラムごと削除しますか？')) return
        } else {
            if (!confirm('このカラムを削除しますか？')) return
        }
        const { success, error } = await deleteKanbanColumn(colId)
        if (success) {
            setColumns(prev => prev.filter(c => c.id !== colId))
            setCards(prev => prev.filter(c => c.column_id !== colId))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
    }

    // ===== Card CRUD =====
    const addCard = async (columnId) => {
        if (!newCardTitle.trim()) return
        const colCards = cards.filter(c => c.column_id === columnId)
        const maxPos = colCards.length > 0 ? Math.max(...colCards.map(c => c.position)) + 1 : 0
        const { data, error } = await addKanbanCard(columnId, newCardTitle.trim(), maxPos, userId)
        if (data) {
            setCards(prev => [...prev, data])
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
        setNewCardTitle('')
        setAddingCardCol(null)
    }

    const updateCard = async () => {
        if (!editingCard || !editForm.title.trim()) return
        const updates = {
            title: editForm.title.trim(),
            description: editForm.description || null,
            color: editForm.color
        }
        const { success, error } = await updateKanbanCard(editingCard.id, updates)
        if (success) {
            setCards(prev => prev.map(c =>
                c.id === editingCard.id ? { ...c, ...updates } : c
            ))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
        setEditingCard(null)
    }

    const deleteCard = async (cardId) => {
        const { success, error } = await deleteKanbanCard(cardId)
        if (success) {
            setCards(prev => prev.filter(c => c.id !== cardId))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
        setEditingCard(null)
    }

    // ===== Label CRUD =====
    const updateLabelNameFn = async (labelId) => {
        if (!editingLabelName.trim()) { setEditingLabelId(null); return }
        const newName = editingLabelName.trim()
        const { success, error } = await updateKanbanLabelName(labelId, newName)
        if (success) {
            setLabels(prev => prev.map(l => l.id === labelId ? { ...l, name: newName } : l))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
        setEditingLabelId(null)
    }

    const toggleExpand = (e, cardId) => {
        e.stopPropagation()
        setExpandedCards(prev => {
            const next = new Set(prev)
            if (next.has(cardId)) {
                next.delete(cardId)
            } else {
                next.add(cardId)
            }
            return next
        })
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

        let newIndex
        if (overInfo) {
            const targetIdx = colCards.findIndex(c => c.id === overInfo.id)
            newIndex = overInfo.above ? targetIdx : targetIdx + 1
        } else {
            // Dropped on empty area
            newIndex = colCards.length
        }

        // Store original cards for rollback
        const originalCards = [...cards]

        // Optimistic update
        setCards(prev => {
            const filtered = prev.filter(c => c.id !== card.id)
            const updatedCard = { ...card, column_id: targetColumnId, position: newIndex }
            return [...filtered, updatedCard].sort((a, b) => {
                if (a.column_id !== b.column_id) return 0
                return a.position - b.position
            })
        })

        // Persist
        const { success, error } = await updateKanbanCardPosition(card.id, targetColumnId, newIndex)
        
        if (!success) {
            console.error('Failed to save card position:', error)
            alert('保存に失敗しました。元の位置に戻します。')
            setCards(originalCards)
        }

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
        setEditingReminderId(null)
        setReminderForm({ type: 'daily', time: '09:00', days: [], date: '' })
        // Load reminders for this card
        const { data } = await getKanbanReminders(card.id)
        setReminders(data || [])
    }

    const handleEditReminder = (reminder) => {
        setEditingReminderId(reminder.id)
        setReminderForm({
            type: reminder.reminder_type,
            time: reminder.remind_time?.substring(0, 5) || '09:00',
            days: reminder.remind_days || [],
            date: reminder.remind_date || ''
        })
        setShowReminderForm(true)
    }

    const handleAddOrUpdateReminder = async () => {
        if (!editingCard) return

        let finalDays = reminderForm.days
        if (reminderForm.type === 'weekday') {
            finalDays = [1, 2, 3, 4, 5]
        } else if (reminderForm.type !== 'weekly') {
            finalDays = []
        }

        const payload = {
            reminder_type: reminderForm.type,
            remind_time: reminderForm.time,
            remind_days: finalDays,
            remind_date: reminderForm.type === 'once' ? reminderForm.date : null,
        }

        if (editingReminderId) {
            const { success, error } = await updateKanbanReminder(editingReminderId, payload)
            if (success) {
                setReminders(prev => prev.map(r => r.id === editingReminderId ? { ...r, ...payload } : r))
            } else if (error) {
                alert('エラーが発生しました: ' + error)
            }
        } else {
            const { data, error } = await addKanbanReminder(
                editingCard.id,
                payload.reminder_type,
                payload.remind_time,
                payload.remind_days,
                payload.remind_date,
                userId
            )
            if (data) {
                setReminders(prev => [...prev, data])
                setReminderCardsMap(prev => ({ ...prev, [editingCard.id]: true }))
            } else if (error) {
                alert('エラーが発生しました: ' + error)
            }
        }
        setShowReminderForm(false)
        setReminderForm({ type: 'daily', time: '09:00', days: [], date: '' })
        setEditingReminderId(null)
    }

    const handleToggleReminder = async (reminderId, currentEnabled) => {
        const { success, error } = await updateKanbanReminder(reminderId, { enabled: !currentEnabled })
        if (success) {
            setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, enabled: !currentEnabled } : r))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
    }

    const handleDeleteReminder = async (reminderId) => {
        const { success, error } = await deleteKanbanReminder(reminderId)
        if (success) {
            setReminders(prev => prev.filter(r => r.id !== reminderId))
        } else if (error) {
            alert('エラーが発生しました: ' + error)
        }
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
            case 'weekday': return `平日 ${time}`
            case 'weekly': {
                const dayStr = (r.remind_days || []).map(d => DAY_LABELS[d]).join(', ')
                return `毎週 ${dayStr} ${time}`
            }
            case 'once': return `${r.remind_date || ''} ${time}`
            default: return time
        }
    }

    useEffect(() => {
        const map = {}
        if (initialReminders) {
            for (const r of initialReminders) {
                map[r.card_id] = true
            }
            setReminderCardsMap(map)
        }
    }, [initialReminders])

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>読み込み中...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className={styles.retryBtn}>再試行</button>
            </div>
        )
    }

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
                                            <div className={styles.cardDescWrapper}>
                                                <div className={`${styles.cardDescription} ${expandedCards.has(card.id) ? styles.cardDescriptionExpanded : styles.cardDescriptionCollapsed}`}>
                                                    {card.description}
                                                </div>
                                                {card.description.length > 50 && (
                                                    <button
                                                        className={styles.expandRibbon}
                                                        onClick={(e) => toggleExpand(e, card.id)}
                                                    >
                                                        {expandedCards.has(card.id) ? '▲ 閉じる' : '▼ もっと見る'}
                                                    </button>
                                                )}
                                            </div>
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
                                    onClick={() => {
                                        setShowReminderForm(!showReminderForm)
                                        if (showReminderForm) {
                                            setEditingReminderId(null)
                                            setReminderForm({ type: 'daily', time: '09:00', days: [], date: '' })
                                        }
                                    }}
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
                                            <option value="weekday">平日</option>
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
                                    <button className={styles.reminderSubmitBtn} onClick={handleAddOrUpdateReminder}>
                                        {editingReminderId ? 'リマインダーを更新' : 'リマインダーを追加'}
                                    </button>
                                </div>
                            )}

                            {reminders.length > 0 ? (
                                <div className={styles.reminderList}>
                                    {reminders.map(r => (
                                        <div key={r.id} className={`${styles.reminderItem} ${!r.enabled ? styles.reminderDisabled : ''}`}>
                                            <div className={styles.reminderInfo}>
                                                <span className={styles.reminderTypeTag}>
                                                    {r.reminder_type === 'daily' ? '毎日' : r.reminder_type === 'weekday' ? '平日' : r.reminder_type === 'weekly' ? '週次' : '一回'}
                                                </span>
                                                <span className={styles.reminderTime}>{formatReminderInfo(r)}</span>
                                            </div>
                                            <div className={styles.reminderActions}>
                                                <button
                                                    className={styles.reminderEditBtn}
                                                    onClick={() => handleEditReminder(r)}
                                                    title="編集"
                                                >✎</button>
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
