'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSystemNotifications, getUnreadSystemCount, markSystemNotificationsRead } from '@/app/actions/systemNotifications'
import styles from './SystemChatWidget.module.css'

export default function SystemChatWidget({ userId }) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const intervalRef = useRef(null)

    // 未読数取得
    const fetchUnreadCount = useCallback(async () => {
        if (!userId || userId === 'member') return
        try {
            const count = await getUnreadSystemCount(userId)
            setUnreadCount(prev => {
                // 未読数が増えた場合のみ自動で開く
                if (count > prev) {
                    setIsOpen(true)
                    fetchMessages()
                }
                return count
            })
        } catch (e) {
            console.error('Failed to fetch unread count:', e)
        }
    }, [userId])

    // メッセージ取得
    const fetchMessages = useCallback(async () => {
        if (!userId || userId === 'member') return
        setIsLoading(true)
        try {
            const data = await getSystemNotifications(userId)
            setMessages(data)
            // 開いた場合は既読にする
            if (unreadCount > 0) {
                await markSystemNotificationsRead(userId)
                setUnreadCount(0)
            }
        } catch (e) {
            console.error('Failed to fetch system notifications:', e)
        } finally {
            setIsLoading(false)
        }
    }, [userId, unreadCount])

    // 初回ロード・ポーリング
    useEffect(() => {
        fetchUnreadCount()
        intervalRef.current = setInterval(fetchUnreadCount, 60000)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [fetchUnreadCount])

    // ウィジェットを開くとき (手動)
    const handleOpen = async () => {
        setIsOpen(true)
        await fetchMessages()
    }

    // ウィジェットを閉じるとき
    const handleClose = () => {
        setIsOpen(false)
    }

    // メッセージリスト最下部にスクロール
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
        }
    }, [isOpen, messages])

    // 時間フォーマット
    const formatTime = (dateStr) => {
        const d = new Date(dateStr)
        const now = new Date()

        // Convert both to day-only dates (00:00:00 local time) for comparison
        const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        // Difference in days (calendar days)
        const diffDays = Math.round((nowDate - dDate) / (1000 * 60 * 60 * 24))

        const timeStr = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

        if (diffDays === 0) return `今日 ${timeStr}`
        if (diffDays === 1) return `昨日 ${timeStr}`
        if (diffDays === 2) return `一昨日 ${timeStr}`
        return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`
    }

    // adminMember（cookie認証の教職員）の場合はウィジェット非表示
    if (!userId || userId === 'member') return null

    return (
        <div className={styles.container}>
            {/* ミニチャットウィンドウ */}
            {isOpen && (
                <div className={styles.chatWindow}>
                    <div className={styles.chatHeader}>
                        <div className={styles.chatHeaderInfo}>
                            <span className={styles.chatHeaderIcon}>🔔</span>
                            <span className={styles.chatHeaderTitle}>システム通知</span>
                        </div>
                        <button className={styles.closeButton} onClick={handleClose}>✕</button>
                    </div>

                    <div className={styles.chatMessages} ref={messagesEndRef}>
                        {isLoading ? (
                            <div className={styles.loadingState}>読み込み中...</div>
                        ) : messages.length === 0 ? (
                            <div className={styles.emptyState}>通知はありません</div>
                        ) : (
                            [...messages].reverse().map((msg) => (
                                <div key={msg.id} className={styles.messageBubble}>
                                    <div className={styles.messageContent}>
                                        {msg.content.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                {i < msg.content.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                    <div className={styles.messageTime}>{formatTime(msg.created_at)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* フローティングボタン */}
            <button
                className={`${styles.floatingButton} ${isOpen ? styles.active : ''}`}
                onClick={isOpen ? handleClose : handleOpen}
                aria-label="システム通知"
            >
                <span className={styles.bellIcon}>🔔</span>
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>
        </div>
    )
}
