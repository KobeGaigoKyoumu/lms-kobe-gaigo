import { useState, useEffect, useRef } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import styles from './ChatWindow.module.css'

export default function ChatWindow({
    studentId,
    currentUserRole = 'student'
}) {
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [attachment, setAttachment] = useState(null) // { url, name, type }
    const [isUploading, setIsUploading] = useState(false)

    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)

    const POLL_INTERVAL = 5000

    const fetchMessages = async () => {
        try {
            const params = new URLSearchParams()
            if (studentId) params.append('studentId', studentId)

            const res = await fetch(`/api/chat?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch')

            const data = await res.json()
            setMessages(data.messages || [])
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const markRead = async () => {
        if (messages.length === 0) return
        const hasUnread = messages.some(m => !m.read && m.sender_type !== currentUserRole)
        if (hasUnread) {
            try {
                await fetch('/api/chat/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId })
                })
            } catch (e) {
                console.error('Mark read error', e)
            }
        }
    }

    useEffect(() => {
        fetchMessages()
        const interval = setInterval(fetchMessages, POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [studentId])

    useEffect(() => {
        markRead()
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        if (studentId) formData.append('studentId', studentId)

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

    const handleSend = async (e) => {
        e.preventDefault()
        if ((!inputText.trim() && !attachment) || isSending || isUploading) return

        setIsSending(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: inputText,
                    studentId: studentId,
                    attachment_url: attachment?.url,
                    attachment_name: attachment?.name,
                    attachment_type: attachment?.type
                })
            })

            if (!res.ok) throw new Error('Send failed')

            setInputText('')
            setAttachment(null)
            await fetchMessages()
        } catch (error) {
            alert('送信に失敗しました')
        } finally {
            setIsSending(false)
        }
    }

    const formatTime = (isoString) => {
        const d = new Date(isoString)
        return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const renderAttachment = (msg) => {
        if (!msg.attachment_url) return null

        const isImage = msg.attachment_type?.startsWith('image/')

        if (isImage) {
            return (
                <div className={styles.attachmentImage}>
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                        <img src={msg.attachment_url} alt="attachment" />
                    </a>
                </div>
            )
        }

        return (
            <div className={styles.attachmentFile}>
                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                    <FileText size={16} />
                    <span>{msg.attachment_name || '添付ファイル'}</span>
                </a>
            </div>
        )
    }

    return (
        <div className={styles.chatContainer}>
            <div className={styles.messageArea}>
                {isLoading && <div className={styles.loading}>読み込み中...</div>}
                {!isLoading && messages.length === 0 && (
                    <div className={styles.emptyState}>メッセージはまだありません</div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.sender_type === currentUserRole
                    return (
                        <div key={msg.id} className={`${styles.messageBubble} ${isMe ? styles.mine : styles.theirs}`}>
                            {msg.content && <div className={styles.messageText}>{msg.content}</div>}
                            {renderAttachment(msg)}
                            <span className={styles.timestamp}>{formatTime(msg.created_at)}</span>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputContainer}>
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

                <form className={styles.inputArea} onSubmit={handleSend}>
                    <button
                        type="button"
                        className={styles.attachButton}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || isUploading}
                    >
                        {isUploading ? <Loader2 size={18} className={styles.spin} /> : <Paperclip size={18} />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        disabled={isSending || isUploading}
                    />

                    <input
                        className={styles.input}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="メッセージを入力..."
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        className={styles.sendButton}
                        disabled={isSending || isUploading || (!inputText.trim() && !attachment)}
                    >
                        送信
                    </button>
                </form>
            </div>
        </div>
    )
}
