'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import AnnouncementCard from '@/app/(dashboard)/announcements/AnnouncementCard'
import { Loader2 } from 'lucide-react'
import { getStudentAnnouncements } from '@/app/actions/announcements'

export default function StudentAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true
        const fetchAnnouncements = async () => {
            try {
                const supabase = createClient()
                
                // Get student session from our helper API
                const resSession = await fetch('/api/auth/student-session')
                const session = await resSession.json()

                if (!session || session.error) throw new Error('Unauthorized')

                // Use the new server action instead of RPC
                const { data, error: fetchError } = await getStudentAnnouncements({
                    studentId: session.studentId,
                    className: session.className,
                    academicYear: session.academicYear
                })

                if (fetchError) throw new Error(fetchError)
                if (isMounted) setAnnouncements(data || [])
            } catch (err) {
                console.error('Failed to fetch student announcements:', err)
                if (isMounted) setError('お知らせの取得に失敗しました。')
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchAnnouncements()
        return () => { isMounted = false }
    }, [])

    if (loading) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <h1 className={styles.title}>お知らせ</h1>
                </header>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>お知らせ</h1>
                    <p className={styles.subtitle}>学校からの重要なお知らせ</p>
                </div>
            </header>

            {error && (
                <div className={styles.error}>{error}</div>
            )}

            {!loading && announcements.length === 0 ? (
                <div className={styles.empty}>
                    <p>現在、お知らせはありません。</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {announcements.map(announcement => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            canEdit={false}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
