import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, ArrowUp } from 'lucide-react'
import styles from './ChatWindow.module.css'

export default function ChatWindow({
    studentId,
    currentUserRole = 'student'
}) {
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [attachment, setAttachment] = useState(null) // { url, name, type }
    const [isUploading, setIsUploading] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const topOfChatRef = useRef(null)
    const scrollContainerRef = useRef(null)
    const observerTarget = useRef(null)
    const prevScrollHeight = useRef(0)
    const wasLoadingMoreRef = useRef(false)

    const POLL_INTERVAL = 5000

    // Scroll restoration logic
    useLayoutEffect(() => {
        if (wasLoadingMoreRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const newScrollHeight = container.scrollHeight
            const diff = newScrollHeight - prevScrollHeight.current
            if (diff > 0) {
                container.scrollTop += diff
            }
            wasLoadingMoreRef.current = false
        }
    }, [messages])

    // Initial fetch (latest 50)
    const fetchInitialMessages = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (studentId) params.append('studentId', studentId)
            params.append('limit', '50')

            const res = await fetch(`/api/chat?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch')

            const data = await res.json()
            setMessages(data.messages || [])
            if ((data.messages || []).length < 50) {
                setHasMore(false)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setIsLoading(false)
            // Scroll to bottom on initial load
            setTimeout(scrollToBottom, 100)
        }
    }, [studentId])

    // Load older messages
    const loadMoreMessages = async () => {
        if (!hasMore || isLoadingMore || messages.length === 0) return

        setIsLoadingMore(true)
        wasLoadingMoreRef.current = true

        // Capture scroll height before loading
        if (scrollContainerRef.current) {
            prevScrollHeight.current = scrollContainerRef.current.scrollHeight
        }

        const oldestMessage = messages[0]

        try {
            const params = new URLSearchParams()
            if (studentId) params.append('studentId', studentId)
            params.append('limit', '50')
            params.append('before', oldestMessage.created_at)

            const res = await fetch(`/api/chat?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to load more')

            const data = await res.json()
            const newMessages = data.messages || []

            if (newMessages.length < 50) {
                setHasMore(false)
            }

            if (newMessages.length > 0) {
                setMessages(prev => [...newMessages, ...prev])
            } else {
                wasLoadingMoreRef.current = false
            }
        } catch (error) {
            console.error('Load more error:', error)
            wasLoadingMoreRef.current = false
        } finally {
            setIsLoadingMore(false)
        }
    }

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0]
                if (target.isIntersecting && hasMore && !isLoadingMore && messages.length > 0) {
                    loadMoreMessages()
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [hasMore, isLoadingMore, loadMoreMessages, messages.length])

    // Poll for new messages
    const pollNewMessages = useCallback(async () => {
        if (messages.length === 0) return

        const latestMessage = messages[messages.length - 1]

        try {
            const params = new URLSearchParams()
            if (studentId) params.append('studentId', studentId)
            params.append('after', latestMessage.created_at)

            const res = await fetch(`/api/chat?${params.toString()}`)
            if (!res.ok) return // Silent fail on poll

            const data = await res.json()
            const newMessages = data.messages || []

            if (newMessages.length > 0) {
                const uniqueNew = newMessages.filter(nm => !messages.some(m => m.id === nm.id))
                if (uniqueNew.length > 0) {
                    // Check if user is at bottom before update
                    const isAtBottom = scrollContainerRef.current &&
                        (scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight >= scrollContainerRef.current.scrollHeight - 50)

                    setMessages(prev => [...prev, ...uniqueNew])

                    if (isAtBottom) {
                        setTimeout(scrollToBottom, 100)
                    }
                }
            }
        } catch (error) {
            // Silent error
        }
    }, [studentId, messages])

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
        fetchInitialMessages()
    }, [fetchInitialMessages])

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLoading) pollNewMessages()
        }, POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [pollNewMessages, isLoading])

    useEffect(() => {
        markRead()
    }, [messages.length]) // Trigger on length change mostly

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

            const data = await res.json()
            // Optimistically add or just poll immediately
            // Let's add manually to feel instant
            setMessages(prev => [...prev, data.message])

            setInputText('')
            setAttachment(null)
            setTimeout(scrollToBottom, 50)
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
        const fileName = msg.attachment_name || '添付ファイル'

        if (isImage) {
            return (
                <div
                    className={styles.imageWrapper}
                    onClick={() => setPreviewImage(msg.attachment_url)}
                >
                    <img
                        src={msg.attachment_url}
                        alt="attachment"
                        className={styles.chatImageThumbnail}
                    />
                    <div className={styles.magnifierOverlay}>
                        <ImageIcon size={24} className={styles.magnifierIcon} />
                    </div>
                </div>
            )
        }

        return (
            <a
                href={msg.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.attachmentCard}
            >
                <div className={styles.cardThumbnail}>
                    <FileText size={24} className={styles.cardIcon} />
                </div>
                <div className={styles.cardInfo}>
                    <span className={styles.cardFileName}>{fileName}</span>
                </div>
            </a>
        )
    }

    return (
        <>
            <div className={styles.chatContainer}>
                <div
                    className={styles.messageArea}
                    ref={scrollContainerRef}
                >
                    {/* Top Sentinel for Infinite Scroll */}
                    <div ref={observerTarget} style={{ height: '10px' }} />

                    {isLoadingMore && (
                        <div className={styles.loadingMoreSpinner}>
                            <Loader2 size={20} className={styles.spin} />
                        </div>
                    )}

                    {isLoading && <div className={styles.loading}>読み込み中...</div>}

                    {!isLoading && messages.length === 0 && (
                        <div className={styles.emptyState}>メッセージはまだありません</div>
                    )}


                    {messages.map((msg) => {
                        const isMe = msg.sender_type === currentUserRole
                        return (
                            <div key={msg.id || msg.created_at} className={`${styles.messageBubble} ${isMe ? styles.mine : styles.theirs}`}>
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

            {/* Lightbox Modal */}
            {previewImage && (
                <div className={styles.modalOverlay} onClick={() => setPreviewImage(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button
                            className={styles.closeModalButton}
                            onClick={() => setPreviewImage(null)}
                        >
                            <X size={24} />
                        </button>
                        <img src={previewImage} alt="Full size" className={styles.fullSizeImage} />
                    </div>
                </div>
            )}
        </>
    )
}
