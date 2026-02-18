'use client'

import { useState, useEffect } from 'react'
import StudentList from '@/components/chat/StudentList'
import BroadcastModal from '@/components/chat/BroadcastModal'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'

export default function TeacherCommunicationPage() {
    const [conversations, setConversations] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        const fetchConversations = async () => {
            if (document.visibilityState !== 'visible') return

            try {
                // Direct Supabase call for conversations (Bypasses Vercel API)
                // This logic replicates what was in /api/chat/conversations
                const { data: messages, error } = await supabase
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error

                // Group by student and get last message + unread count
                const studentMap = new Map()
                messages.forEach(msg => {
                    if (!studentMap.has(msg.student_id)) {
                        studentMap.set(msg.student_id, {
                            student_id_text: msg.student_id,
                            last_message: msg.content,
                            unread_count: 0,
                            created_at: msg.created_at
                        })
                    }
                    if (!msg.read && msg.sender_type === 'student') {
                        studentMap.get(msg.student_id).unread_count++
                    }
                })

                // Join with students table to get names/classes
                const studentIds = Array.from(studentMap.keys())
                const { data: studentInfos, error: infoError } = await supabase
                    .from('students')
                    .select('student_id_text, full_name, class_name')
                    .in('student_id_text', studentIds)

                if (infoError) throw infoError

                const finalConversations = studentInfos.map(info => ({
                    ...info,
                    name: info.full_name,
                    ...studentMap.get(info.student_id_text)
                })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

                setConversations(finalConversations)
            } catch (error) {
                console.error('Failed to fetch conversations', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchConversations()

        const interval = setInterval(fetchConversations, 120000)
        return () => clearInterval(interval)
    }, [supabase])

    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>コミュニケーション</h1>
                <button
                    className={styles.broadcastButton}
                    onClick={() => setIsBroadcastModalOpen(true)}
                >
                    一斉送信
                </button>
            </div>

            <div className={styles.content}>
                {isLoading ? (
                    <div>読み込み中...</div>
                ) : conversations.length === 0 ? (
                    <div className={styles.empty}>
                        メッセージ履歴のある学生はいません。
                    </div>
                ) : (
                    <div className={styles.listWrapper}>
                        <StudentList students={conversations} />
                    </div>
                )}
            </div>

            <BroadcastModal
                isOpen={isBroadcastModalOpen}
                onClose={() => setIsBroadcastModalOpen(false)}
                onSent={() => {
                    // Optionally refresh the student list to show the new "last_message"
                }}
            />
        </div>
    )
}
