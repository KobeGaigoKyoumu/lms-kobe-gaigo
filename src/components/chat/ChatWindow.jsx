import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, ArrowUp, Download, Trash2, Reply, Bell } from 'lucide-react'
import styles from './ChatWindow.module.css'
import { subscribeUserToPush } from '@/lib/pushNotification'

import { createClient } from '@/lib/supabase/client'

export default function ChatWindow({
    studentId,
    currentUserRole = 'student'
}) {
    const supabase = createClient()
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
    const [pushEnabled, setPushEnabled] = useState(false)

    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const topOfChatRef = useRef(null)
    const scrollContainerRef = useRef(null)
    const observerTarget = useRef(null)
    const prevScrollHeight = useRef(0)
    const wasLoadingMoreRef = useRef(false)

    // Push Notification Subscription
    useEffect(() => {
        // Try to subscribe quietly first, or check if already subscribed
        if ('Notification' in window && Notification.permission === 'granted') {
            subscribeUserToPush().then(result => setPushEnabled(result.success))
        }
    }, [])

    const handleEnablePush = async () => {
        const result = await subscribeUserToPush()
        setPushEnabled(result.success)
        if (result.success) {
            alert('通知を有効にしました')
        } else {
            alert(`通知の有効化に失敗しました: ${result.error}`)
        }
    }

    // Realtime Subscription & Polling Fallback
    const POLL_INTERVAL = 600000 // 10 minutes (fallback, relying on Realtime)

    useEffect(() => {
        if (!studentId) return

        // Supabase Realtime Subscription
        const channel = supabase
            .channel(`chat:${studentId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `student_id=eq.${studentId}`
            }, (payload) => {
                const newMessage = payload.new
                // Prevent duplicates if already added by optimistic UI or poll
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev

                    // Note: If user is scrolled up, we might want to show "New Message" banner instead of auto-scrolling
                    // For now, we just append.
                    const isAtBottom = scrollContainerRef.current &&
                        (scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight >= scrollContainerRef.current.scrollHeight - 50)

                    if (isAtBottom) {
                        setTimeout(scrollToBottom, 100)
                    }

                    return [...prev, newMessage]
                })

                // If message is from the other party, mark as read logic is handled by the useEffect
                // to batch/debounce updates.
                /* 
                if (newMessage.sender_type !== currentUserRole) {
                    fetch('/api/chat/mark-read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ studentId })
                    }).catch(e => console.error('Realtime mark read error', e))
                }
                */
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [studentId, currentUserRole])

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

    // Initial fetch (latest 30) - Direct Supabase implementation
    const fetchInitialMessages = useCallback(async () => {
        setIsLoading(true)
        try {
            // Clear App Badge when opening chat
            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(0).catch(e => console.error('Failed to clear badge', e))
            } else if ('clearAppBadge' in navigator) {
                navigator.clearAppBadge().catch(e => console.error('Failed to clear badge', e))
            }

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(30)

            if (error) throw error

            const reversed = [...(data || [])].reverse()
            setMessages(reversed)
            if ((data || []).length < 30) {
                setHasMore(false)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setIsLoading(false)
            setTimeout(scrollToBottom, 100)
        }
    }, [studentId, supabase])

    // Load older messages - Direct Supabase implementation
    const loadMoreMessages = async () => {
        if (!hasMore || isLoadingMore || messages.length === 0) return

        setIsLoadingMore(true)
        wasLoadingMoreRef.current = true

        if (scrollContainerRef.current) {
            prevScrollHeight.current = scrollContainerRef.current.scrollHeight
        }

        const oldestMessage = messages[0]

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('student_id', studentId)
                .lt('created_at', oldestMessage.created_at)
                .order('created_at', { ascending: false })
                .limit(30)

            if (error) throw error

            if ((data || []).length < 30) {
                setHasMore(false)
            }

            if (data && data.length > 0) {
                const older = [...data].reverse()
                setMessages(prev => [...older, ...prev])
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

    // Poll for new messages (Direct Supabase version)
    const pollNewMessages = useCallback(async () => {
        if (messages.length === 0 || isLoading || isSending) return

        const latestMessage = messages[messages.length - 1]

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('student_id', studentId)
                .gt('created_at', latestMessage.created_at)
                .order('created_at', { ascending: true })

            if (error) throw error

            if (data && data.length > 0) {
                setMessages(prev => {
                    const uniqueNew = data.filter(nm => !prev.some(m => m.id === nm.id))
                    if (uniqueNew.length === 0) return prev

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
    }, [studentId, messages, isLoading, isSending, supabase])

    // Debounced Mark Read
    const markReadTimeoutRef = useRef(null)

    const markRead = async () => {
        if (messages.length === 0) return
        const hasUnread = messages.some(m => !m.read && m.sender_type !== currentUserRole)

        if (hasUnread) {
            // Clear existing timeout to debounce
            if (markReadTimeoutRef.current) {
                clearTimeout(markReadTimeoutRef.current)
            }
            // Set new timeout (e.g., 2 seconds debounce)
            markReadTimeoutRef.current = setTimeout(async () => {
                try {
                    const CLOUDFLARE_WORKER_URL = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;

                    // console.log よりも確実に気づけるように、開発時や特定の条件下で alert を出すこともできます
                    // ここでは console.log で状況を詳しく出力します
                    if (CLOUDFLARE_WORKER_URL) {
                        console.log('✅ Cloudflare Worker を使用します:', CLOUDFLARE_WORKER_URL);
                        await fetch(CLOUDFLARE_WORKER_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ studentId, senderType: currentUserRole })
                        })
                    } else {
                        // 診断用アラートを追加 (実運用ではログのみにするべきですが、デバッグのため一時的に)
                        alert('【デバッグ用】Cloudflare URLが設定されていません。Vercel設定を確認してください。');
                        console.error('❌ NEXT_PUBLIC_CHAT_WORKER_URL が設定されていないため、Vercel API にフォールバックします。Vercel の環境変数を確認してください。');
                        await fetch('/api/chat/mark-read', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ studentId })
                        })
                    }

                    // Optimistically update local state
                    setMessages(prev => prev.map(m =>
                        (!m.read && m.sender_type !== currentUserRole) ? { ...m, read: true } : m
                    ))
                } catch (e) {
                    console.error('Mark read error', e)
                }
            }, 2000)
        }
    }

    useEffect(() => {
        fetchInitialMessages()
    }, [fetchInitialMessages])

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLoading && document.visibilityState === 'visible') {
                pollNewMessages()
            }
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

    // Image Compression Utility
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimensions
                    const MAX_WIDTH = 1280;
                    const MAX_HEIGHT = 1280;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Canvas is empty'));
                            return;
                        }
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    }, 'image/jpeg', 0.7); // 70% quality
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        let uploadFile = file;

        // Compress if image
        if (file.type.startsWith('image/')) {
            try {
                uploadFile = await compressImage(file);
            } catch (error) {
                console.error('Compression failed, using original', error);
            }
        }

        // 1MB Size Limit Check
        const MAX_SIZE = 1 * 1024 * 1024; // 1MB
        if (uploadFile.size > MAX_SIZE) {
            alert('ファイルサイズが大きすぎます (最大1MB)。');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', uploadFile)
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
            // Role Determination Logic from server-side moved to client
            let payload = {
                student_id: studentId,
                content: inputText || '',
                attachment_url: attachment?.url,
                attachment_name: attachment?.name,
                attachment_type: attachment?.type,
                reply_to_id: replyingTo?.id || null,
                read: false,
                created_at: new Date().toISOString()
            }

            if (currentUserRole === 'teacher') {
                const { data: { user } } = await supabase.auth.getUser()
                payload.teacher_id = user?.id
                payload.sender_type = 'teacher'
            } else {
                payload.teacher_id = null
                payload.sender_type = 'student'
            }

            // Direct Insert to Supabase (Bypasses Vercel API CPU usage)
            const { data, error } = await supabase
                .from('messages')
                .insert([payload])
                .select()
                .single()

            if (error) throw error

            // Optimistically add or let Realtime handle it (Realtime is already active)
            setMessages(prev => {
                if (prev.some(m => m.id === data.id)) return prev
                return [...prev, data]
            })

            setInputText('')
            setAttachment(null)
            setReplyingTo(null)
            setTimeout(scrollToBottom, 50)
        } catch (error) {
            console.error('Send error:', error)
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

        const getDisplayUrl = (url) => {
            if (!url) return ''
            if (url.startsWith('https://lh3.googleusercontent.com')) return url

            const drivePatterns = [
                /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]{25,})/,
                /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{25,})/,
                /drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]{25,})/
            ]

            for (const pattern of drivePatterns) {
                const match = url.match(pattern)
                if (match && match[1]) {
                    return `https://lh3.googleusercontent.com/d/${match[1]}`
                }
            }
            return url
        }

        const displayUrl = getDisplayUrl(msg.attachment_url)
        const isLegacyGoogle = displayUrl.includes('googleusercontent.com') || displayUrl.includes('drive.google.com')

        if (isImage && !isLegacyGoogle) {
            return (
                <div
                    className={styles.imageWrapper}
                    onClick={() => setPreviewImage(displayUrl)}
                >
                    <img
                        src={displayUrl}
                        alt="attachment"
                        className={styles.chatImageThumbnail}
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
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
                    {isLegacyGoogle && isImage ? (
                        <ImageIcon size={24} className={styles.cardIcon} />
                    ) : (
                        <FileText size={24} className={styles.cardIcon} />
                    )}
                </div>
                <div className={styles.cardInfo}>
                    <span className={styles.cardFileName}>
                        {isLegacyGoogle && isImage ? `[旧データ] ${fileName}` : fileName}
                    </span>
                    {isLegacyGoogle && (
                        <span className={styles.legacyNote} style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px', display: 'block' }}>
                            クリックして表示を試みる
                        </span>
                    )}
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

                    {!pushEnabled ? (
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                            <button
                                onClick={handleEnablePush}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: '#fff',
                                    color: '#4b5563',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Bell size={16} />
                                通知を有効にする
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/push/test', { method: 'POST' })
                                        const data = await res.json()
                                        if (res.ok) {
                                            alert(data.message)
                                        } else {
                                            alert(`テスト送信失敗: ${data.error}`)
                                        }
                                    } catch (e) {
                                        console.error(e)
                                        alert(`エラー詳細: ${e.message || JSON.stringify(e, Object.getOwnPropertyNames(e))}`)
                                    }
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: '#f9fafb',
                                    color: '#6b7280',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Bell size={14} />
                                通知テスト
                            </button>
                        </div>
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
