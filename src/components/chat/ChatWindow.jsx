import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, ArrowUp, Download, Trash2, Reply } from 'lucide-react'
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
    const [previewImage, setPreviewImage] = useState(null)
    const [replyingTo, setReplyingTo] = useState(null) // { id, content, sender_type }
    const [highlightedMessageId, setHighlightedMessageId] = useState(null)

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
                setMessages(prev => {
                    const uniqueNew = newMessages.filter(nm => !prev.some(m => m.id === nm.id))
                    if (uniqueNew.length === 0) return prev

                    // Check if user is at bottom before update
                    const isAtBottom = scrollContainerRef.current &&
                        (scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight >= scrollContainerRef.current.scrollHeight - 50)

                    const updated = [...prev, ...uniqueNew]

                    if (isAtBottom) {
                        setTimeout(scrollToBottom, 100)
                    }
                    return updated
                })
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

    const scrollToMessage = (messageId) => {
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(messageId);
            setTimeout(() => setHighlightedMessageId(null), 2000);
        } else {
            // If message not in currently loaded messages, maybe fetch or just alert
            console.log('Message element not found');
        }
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
                    attachment_type: attachment?.type,
                    replyToId: replyingTo?.id
                })
            })

            if (!res.ok) throw new Error('Send failed')

            const data = await res.json()
            // Optimistically add or just poll immediately
            // Prevent duplicate if poll already picked it up
            setMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) return prev
                return [...prev, data.message]
            })

            setInputText('')
            setAttachment(null)
            setReplyingTo(null)
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
                        // Find parent message if this is a reply
                        const replyParent = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null

                        return (
                            <div
                                key={msg.id || msg.created_at}
                                className={`${styles.messageBubbleContainer} ${isMe ? styles.myMessage : styles.theirMessage}`}
                            >
                                {msg.deleted_at ? (
                                    <div className={`${styles.messageBubble} ${isMe ? styles.mine : styles.theirs} ${styles.deletedMessage}`}>
                                        送信取り消しされました
                                    </div>
                                ) : (
                                    <div
                                        id={`msg-${msg.id}`}
                                        className={`${styles.messageBubble} ${isMe ? styles.mine : styles.theirs} ${highlightedMessageId === msg.id ? styles.highlighted : ''}`}
                                    >
                                        {/* Reply Context (Parent Message Preview) */}
                                        {msg.reply_to_id && (
                                            <div
                                                className={styles.replyContext}
                                                onClick={() => scrollToMessage(msg.reply_to_id)}
                                            >
                                                <div className={styles.replyContent}>
                                                    {replyParent ? (
                                                        <>
                                                            <span className={styles.replySender}>
                                                                {replyParent.sender_type === 'teacher' ? '先生' : '学生'}
                                                            </span>
                                                            <span className={styles.replyTextSnippet}>
                                                                {replyParent.content || (replyParent.attachment_url ? '添付ファイル' : '...')}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className={styles.replyTextSnippet}>メッセージが見つかりません</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {msg.content && (
                                            <div className={styles.messageText}>
                                                {/* Mention Highlighting */}
                                                {msg.content.split(/(@[^\s]+)/g).map((part, i) =>
                                                    part.startsWith('@') ? <span key={i} className={styles.mention}>{part}</span> : part
                                                )}
                                            </div>
                                        )}
                                        {renderAttachment(msg)}
                                        <div className={styles.messageFooter}>
                                            <span className={styles.timestamp}>{formatTime(msg.created_at)}</span>

                                            {/* Action Buttons */}
                                            <div className={styles.actionButtons}>
                                                {/* Reply Button */}
                                                <button
                                                    className={styles.actionButton}
                                                    onClick={() => {
                                                        setReplyingTo(msg)
                                                        fileInputRef.current?.focus()
                                                    }}
                                                    title="返信"
                                                >
                                                    <Reply size={14} />
                                                </button>

                                                {/* Translate Button */}


                                                {/* Delete Button (Only for own messages) */}
                                                {isMe && (
                                                    <button
                                                        className={`${styles.actionButton} ${styles.deleteButton}`}
                                                        onClick={async () => {
                                                            if (!confirm('メッセージを削除しますか？')) return
                                                            try {
                                                                const res = await fetch(`/api/chat?id=${msg.id}`, { method: 'DELETE' })
                                                                if (res.ok) {
                                                                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString() } : m))
                                                                } else {
                                                                    const data = await res.json()
                                                                    alert(`削除に失敗しました: ${data.error || '不明なエラー'}`)
                                                                }
                                                            } catch (e) {
                                                                console.error(e)
                                                                alert('エラーが発生しました')
                                                            }
                                                        }}
                                                        title="削除"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputContainer}>
                    {/* Reply Preview Banner */}
                    {replyingTo && (
                        <div className={styles.replyPreviewBanner}>
                            <div className={styles.replyPreviewContent}>
                                <Reply size={14} className={styles.replyIcon} />
                                <div className={styles.replyInfo}>
                                    <span className={styles.replyingToName}>
                                        {replyingTo.sender_type === 'teacher' ? '先生' : '学生'}への返信
                                    </span>
                                    <span className={styles.replyingToText}>
                                        {replyingTo.content || (replyingTo.attachment_url ? '添付ファイル' : '')}
                                    </span>
                                </div>
                            </div>
                            <button
                                className={styles.closeReplyButton}
                                onClick={() => setReplyingTo(null)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

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
            </div >

            {/* Lightbox Modal */}
            {
                previewImage && (
                    <div className={styles.modalOverlay} onClick={() => setPreviewImage(null)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <button
                                className={styles.downloadButton}
                                onClick={async () => {
                                    try {
                                        const response = await fetch(previewImage);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `image-${Date.now()}.png`; // Simple fallback name
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    } catch (error) {
                                        console.error('Download failed', error);
                                        alert('ダウンロードに失敗しました');
                                    }
                                }}
                                title="ダウンロード"
                            >
                                <Download size={24} />
                            </button>
                            <button
                                className={styles.closeModalButton}
                                onClick={() => setPreviewImage(null)}
                            >
                                <X size={24} />
                            </button>
                            <img src={previewImage} alt="Full size" className={styles.fullSizeImage} />
                        </div>
                    </div>
                )
            }
        </>
    )
}
