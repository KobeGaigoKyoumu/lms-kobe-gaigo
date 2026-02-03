'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './ChatWindow.module.css'

export default function ChatWindow({
    studentId, // If provided, we are a teacher chatting with this student. If null, we are the student.
    currentUserRole = 'student' // 'student' or 'teacher'
}) {
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef(null)

    // Polling interval in milliseconds
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

        // Only mark read if there are unread messages from the OTHER party
        const hasUnread = messages.some(m =>
            !m.read && m.sender_type !== currentUserRole
        )

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

    // Mark read when messages update
    useEffect(() => {
        markRead()
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!inputText.trim() || isSending) return

        setIsSending(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: inputText,
                    studentId: studentId // Optional if student, required if teacher
                })
            })

            if (!res.ok) throw new Error('Send failed')

            const data = await res.json()
            // Optimistically add or re-fetch
            setInputText('')
            await fetchMessages() // Re-fetch to be safe and get canonical timestamp
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
                        <div
                            key={msg.id}
                            className={`${styles.messageBubble} ${isMe ? styles.mine : styles.theirs}`}
                        >
                            {msg.content}
                            <span className={styles.timestamp}>{formatTime(msg.created_at)}</span>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
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
                    disabled={isSending || !inputText.trim()}
                >
                    送信
                </button>
            </form>
        </div>
    )
}
