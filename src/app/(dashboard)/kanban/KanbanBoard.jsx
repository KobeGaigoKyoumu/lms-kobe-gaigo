'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

// LABEL_COLORS are now fetched from DB


const CARD_COLORS = [
    null, '#e74c3c', '#27ae60', '#f39c12', '#9b59b6',
    '#3498db', '#e67e22', '#1abc9c', '#2c3e50'
]

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
    const [editForm, setEditForm] = useState({ title: '', description: '', color: null })

    // Drag state
    const dragCard = useRef(null)
    const dragOverCol = useRef(null)

    const supabase = createClient()

    // ===== Column CRUD =====
    const addColumn = async () => {
        if (!newColumnTitle.trim()) return
        const maxPos = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 0
        const { data, error } = await supabase
            .from('kanban_columns')
            .insert({ title: newColumnTitle.trim(), position: maxPos, created_by: userId })
            .select()
            .single()
        if (!error && data) {
            setColumns(prev => [...prev, data])
        }
        setNewColumnTitle('')
        setAddingColumn(false)
    }

    const updateColumnTitle = async (colId) => {
        if (!editingColTitle.trim()) { setEditingColId(null); return }
        await supabase
            .from('kanban_columns')
            .update({ title: editingColTitle.trim() })
            .eq('id', colId)
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
        await supabase.from('kanban_columns').delete().eq('id', colId)
        setColumns(prev => prev.filter(c => c.id !== colId))
        setCards(prev => prev.filter(c => c.column_id !== colId))
    }

    // ===== Card CRUD =====
    const addCard = async (columnId) => {
        if (!newCardTitle.trim()) return
        const colCards = cards.filter(c => c.column_id === columnId)
        const maxPos = colCards.length > 0 ? Math.max(...colCards.map(c => c.position)) + 1 : 0
        const { data, error } = await supabase
            .from('kanban_cards')
            .insert({
                column_id: columnId,
                title: newCardTitle.trim(),
                position: maxPos,
                created_by: userId
            })
            .select()
            .single()
        if (!error && data) {
            setCards(prev => [...prev, data])
        }
        setNewCardTitle('')
        setAddingCardCol(null)
    }

    const updateCard = async () => {
        if (!editingCard || !editForm.title.trim()) return
        const { error } = await supabase
            .from('kanban_cards')
            .update({
                title: editForm.title.trim(),
                description: editForm.description || null,
                color: editForm.color
            })
            .eq('id', editingCard.id)
        if (!error) {
            setCards(prev => prev.map(c =>
                c.id === editingCard.id
                    ? { ...c, title: editForm.title.trim(), description: editForm.description || null, color: editForm.color }
                    : c
            ))
        }
        setEditingCard(null)
    }

    const deleteCard = async (cardId) => {
        await supabase.from('kanban_cards').delete().eq('id', cardId)
        setCards(prev => prev.filter(c => c.id !== cardId))
        setEditingCard(null)
    }

    // ===== Label CRUD =====
    const updateLabelName = async (labelId) => {
        if (!editingLabelName.trim()) { setEditingLabelId(null); return }
        const newName = editingLabelName.trim()

        await supabase
            .from('kanban_labels')
            .update({ name: newName })
            .eq('id', labelId)

        setLabels(prev => prev.map(l => l.id === labelId ? { ...l, name: newName } : l))
        setEditingLabelId(null)
    }


    // ===== Drag & Drop =====
    const handleDragStart = useCallback((e, card) => {
        dragCard.current = card
        e.dataTransfer.effectAllowed = 'move'
        e.target.classList.add(styles.cardDragging)
    }, [])

    const handleDragEnd = useCallback((e) => {
        e.target.classList.remove(styles.cardDragging)
        dragCard.current = null
        dragOverCol.current = null
    }, [])

    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const handleDragEnter = useCallback((e, columnId) => {
        e.preventDefault()
        dragOverCol.current = columnId
    }, [])

    const handleDrop = useCallback(async (e, targetColumnId) => {
        e.preventDefault()
        const card = dragCard.current
        if (!card || card.column_id === targetColumnId) {
            dragCard.current = null
            return
        }

        // Optimistic update
        const newCards = cards.map(c =>
            c.id === card.id ? { ...c, column_id: targetColumnId } : c
        )
        setCards(newCards)

        // Persist
        await supabase
            .from('kanban_cards')
            .update({ column_id: targetColumnId })
            .eq('id', card.id)

        dragCard.current = null
    }, [cards, supabase])

    const openEditModal = (card) => {
        setEditingCard(card)
        setEditForm({
            title: card.title,
            description: card.description || '',
            color: card.color || null
        })
    }

    return (
        <>
            <div className={styles.board}>
                {columns.map(col => {
                    const colCards = cards.filter(c => c.column_id === col.id)
                    return (
                        <div key={col.id} className={styles.column}>
                            {/* Column Header */}
                            <div className={styles.columnHeader}>
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
                                className={`${styles.cardList} ${dragOverCol.current === col.id ? styles.cardListDragOver : ''}`}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, col.id)}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                {colCards.map(card => (
                                    <div
                                        key={card.id}
                                        className={styles.card}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, card)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => openEditModal(card)}
                                    >
                                        {card.color && (
                                            <div className={styles.cardColorBar} style={{ background: card.color }} />
                                        )}
                                        <div className={styles.cardTitle}>{card.title}</div>
                                        {card.description && (
                                            <div className={styles.cardDescription}>{card.description}</div>
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
                                onBlur={() => updateLabelName(lbl.id)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') updateLabelName(lbl.id)
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
