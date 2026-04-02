'use server'

import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import styles from './page.module.css'
import { ArrowLeft, Megaphone, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function StudentAnnouncementDetailPage({ params }) {
    const { id } = await params
    const session = await getStudentSession()
    if (!session) redirect('/login')

    const supabase = await createClient()

    const { data: announcement, error } = await supabase
        .from('announcements')
        .select(`
            *,
            author:profiles!author_id (full_name)
        `)
        .eq('id', id)
        .single()

    if (error || !announcement) {
        notFound()
    }

    // Complement author name from admin_members if profile join is null
    let adminAuthorName = null
    if (!announcement.sender_name && !announcement.author?.full_name && announcement.author_id) {
        const { data: admin } = await supabase
            .from('admin_members')
            .select('name')
            .eq('id', announcement.author_id)
            .single()
        if (admin) {
            adminAuthorName = admin.name
        }
    }

    // Permission check (same as dashboard)
    const canSee = () => {
        if (!announcement.target_type || announcement.target_type === 'all') return true
        if (announcement.target_type === 'grade') {
            const currentYear = new Date().getFullYear()
            const isBeforeApril = new Date().getMonth() < 3
            const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
            const studentGrade = academicYearBase - session.academicYear + 1
            return String(studentGrade) === announcement.target_grade
        }
        if (announcement.target_type === 'class') {
            return announcement.target_class === session.className
        }
        if (announcement.target_type === 'individual') {
            return announcement.target_student_ids?.includes(session.studentId)
        }
        return false
    }

    if (!canSee()) {
        notFound()
    }

    return (
        <div className={styles.container}>
            <Link href="/student/dashboard" className={styles.backButton}>
                <ArrowLeft size={20} />
                ダッシュボードへ戻る
            </Link>

            <article className={styles.announcementBox}>
                <div className={styles.header}>
                    <div className={styles.iconArea}>
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{announcement.title}</h1>
                        <div className={styles.meta}>
                            <span className={styles.metaItem}>
                                <Calendar size={14} />
                                {new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                            <span className={styles.metaItem}>
                                <User size={14} />
                                {announcement.sender_name || adminAuthorName || announcement.author?.full_name || '教務'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.content}>
                    {announcement.content?.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>
            </article>
        </div>
    )
}
