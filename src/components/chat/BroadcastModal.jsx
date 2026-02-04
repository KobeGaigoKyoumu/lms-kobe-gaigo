'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Search, Users, Check, Filter, Send, Loader2, Paperclip, FileText, Image as ImageIcon } from 'lucide-react'
import styles from './BroadcastModal.module.css'

export default function BroadcastModal({ isOpen, onClose, onSent }) {
    const [students, setStudents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filterGrade, setFilterGrade] = useState('ALL')
    const [filterClass, setFilterClass] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [messageContent, setMessageContent] = useState('')
    const [attachment, setAttachment] = useState(null) // { url, name, type }
    const [isUploading, setIsUploading] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return

        const fetchStudents = async () => {
            setIsLoading(true)
            try {
                const res = await fetch('/api/chat/students')
                if (res.ok) {
                    const data = await res.json()
                    setStudents(data.students || [])
                }
            } catch (error) {
                console.error('Failed to fetch students', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStudents()
    }, [isOpen])

    const classes = useMemo(() => {
        const set = new Set(students.map(s => s.class_name).filter(Boolean))
        return [...set].sort()
    }, [students])

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesGrade = filterGrade === 'ALL' || s.grade === parseInt(filterGrade)
            const matchesClass = filterClass === 'ALL' || s.class_name === filterClass
            const matchesSearch = !searchQuery ||
                s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.student_id_text?.includes(searchQuery)
            return matchesGrade && matchesClass && matchesSearch
        })
    }, [students, filterGrade, filterClass, searchQuery])

    const toggleStudent = (id) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleAllVisible = () => {
        if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredStudents.map(s => s.student_id_text)))
        }
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/chat/upload', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Upload failed')

            const data = await res.json()
            setAttachment({
                url: data.url,
                name: data.name,
                type: data.type
            })
        } catch (error) {
            console.error('Upload error:', error)
            alert('ファイルのアップロードに失敗しました')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleSend = async () => {
        if (selectedIds.size === 0 || !messageContent.trim()) return
        if (!confirm(`${selectedIds.size}名にメッセージを送信しますか？`)) return

        setIsSending(true)
        try {
            const res = await fetch('/api/chat/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentIds: Array.from(selectedIds),
                    content: messageContent,
                    attachment_url: attachment?.url,
                    attachment_name: attachment?.name,
                    attachment_type: attachment?.type
                })
            })

            if (res.ok) {
                alert('一斉送信が完了しました。')
                setMessageContent('')
                setAttachment(null)
                setSelectedIds(new Set())
                onSent?.()
                onClose()
            } else {
                const data = await res.json()
                alert(`送信に失敗しました: ${data.error || '不明なエラー'}`)
            }
        } catch (error) {
            console.error('Broadcast send error', error)
            alert('通信エラーが発生しました。')
        } finally {
            setIsSending(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Users className={styles.headerIcon} />
                        <h2>一斉メッセージ送信</h2>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.leftCol}>
                        <div className={styles.filtersSection}>
                            <div className={styles.searchBar}>
                                <Search size={16} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="名前・学籍番号で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className={styles.filterGrid}>
                                <div className={styles.filterItem}>
                                    <label>学年</label>
                                    <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                                        <option value="ALL">すべて</option>
                                        <option value="1">1年生</option>
                                        <option value="2">2年生</option>
                                    </select>
                                </div>
                                <div className={styles.filterItem}>
                                    <label>クラス</label>
                                    <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                                        <option value="ALL">すべて</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className={styles.studentListSection}>
                            <div className={styles.listHeader}>
                                <span className={styles.matchCount}>{filteredStudents.length} 名が該当</span>
                                <button className={styles.toggleAllBtn} onClick={toggleAllVisible}>
                                    {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? '全解除' : '全選択'}
                                </button>
                            </div>

                            <div className={styles.studentList}>
                                {isLoading ? (
                                    <div className={styles.centerBox}><Loader2 className={styles.spin} /></div>
                                ) : filteredStudents.length === 0 ? (
                                    <div className={styles.centerBox}>学生が見つかりません。</div>
                                ) : (
                                    filteredStudents.map(s => (
                                        <div
                                            key={s.student_id_text}
                                            className={`${styles.studentItem} ${selectedIds.has(s.student_id_text) ? styles.selected : ''}`}
                                            onClick={() => toggleStudent(s.student_id_text)}
                                        >
                                            <div className={styles.checkbox}>
                                                {selectedIds.has(s.student_id_text) && <Check size={14} />}
                                            </div>
                                            <div className={styles.studentInfo}>
                                                <span className={styles.studentName}>{s.full_name}</span>
                                                <span className={styles.studentClass}>{s.class_name}</span>
                                                <span className={styles.studentId}>{s.student_id_text}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.rightCol}>
                        <div className={styles.messageSection}>
                            <label className={styles.sectionLabel}>メッセージ内容</label>
                            <textarea
                                placeholder="送信するメッセージを入力してください..."
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                className={styles.textarea}
                            />

                            {attachment && (
                                <div className={styles.attachmentPreview}>
                                    <div className={styles.previewContent}>
                                        {attachment.type?.startsWith('image/') ? (
                                            <ImageIcon size={16} className={styles.previewIcon} />
                                        ) : (
                                            <FileText size={16} className={styles.previewIcon} />
                                        )}
                                        <span className={styles.previewName}>{attachment.name}</span>
                                    </div>
                                    <button onClick={() => setAttachment(null)} className={styles.removeAttachment}>
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className={styles.actionRow}>
                                <button
                                    type="button"
                                    className={styles.attachButton}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSending || isUploading}
                                >
                                    {isUploading ? <Loader2 size={18} className={styles.spin} /> : <Paperclip size={18} />}
                                    添付
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    disabled={isSending || isUploading}
                                />
                                <div className={styles.selectedSummary}>
                                    <strong>対象学生:</strong> {selectedIds.size} 名
                                </div>
                            </div>
                            <button
                                className={styles.sendButton}
                                onClick={handleSend}
                                disabled={isSending || selectedIds.size === 0 || (!messageContent.trim() && !attachment)}
                            >
                                {isSending ? <Loader2 className={styles.spin} /> : <Send size={18} />}
                                {isSending ? '送信中...' : 'メッセージを送信'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
