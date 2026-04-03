'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AnnouncementCard from './AnnouncementCard'
import styles from './page.module.css'
import Link from 'next/link'

export default function AnnouncementList({ adminMember, profileRole }) {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select(`
                        id, title, content, is_pinned, created_at, author_id, sender_name, course_id, file_urls,
                        author:profiles!author_id (
                            id,
                            full_name,
                            avatar_url
                        ),
                        course:courses (
                            id,
                            title
                        )
                    `)
                    .order('is_pinned', { ascending: false })
                    .order('created_at', { ascending: false })

                if (error) throw error
                setAnnouncements(data || [])
            } catch (err) {
                console.error('Error fetching announcements:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchAnnouncements()
    }, [supabase])

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>お知らせを読み込み中...</p>
            </div>
        )
    }

    if (error) {
        return <div className={styles.error}>お知らせの取得に失敗しました: {error}</div>
    }

    if (announcements.length === 0) {
        const isTeacherOrAdmin = true // Based on current logic
        return (
            <div className={styles.empty}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                    <path d="M40 16v20a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V16" />
                    <path d="M12 16l20-12 20 12" />
                    <path d="M32 28v12" />
                </svg>
                <p>お知らせはありません</p>
                {isTeacherOrAdmin && (
                    <Link href="/announcements/new" className={styles.emptyBtn}>
                        最初のお知らせを作成
                    </Link>
                )}
            </div>
        )
    }

    return (
        <div className={styles.list}>
            {announcements.map(announcement => (
                <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    canEdit={profileRole === 'admin' || announcement.author_id === adminMember?.memberId}
                />
            ))}
        </div>
    )
}
