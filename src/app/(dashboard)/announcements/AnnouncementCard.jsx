'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import styles from './page.module.css'

export default function AnnouncementCard({ announcement, canEdit }) {
    const router = useRouter()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcement.id)

        if (error) {
            console.error('Delete error:', error)
            setDeleting(false)
            return
        }

        router.refresh()
    }

    const handleTogglePin = async () => {
        const supabase = createClient()
        await supabase
            .from('announcements')
            .update({ is_pinned: !announcement.is_pinned })
            .eq('id', announcement.id)
        router.refresh()
    }

    return (
        <article className={styles.card}>
            <div className={styles.cardHeader}>
                {announcement.is_pinned && (
                    <span className={styles.pinBadge}>
                        📌 ピン留め
                    </span>
                )}
                {announcement.course && (
                    <span className={styles.courseBadge}>
                        {announcement.course.title}
                    </span>
                )}
                <span className={styles.date}>
                    {new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </span>
            </div>

            <h2 className={styles.cardTitle}>{announcement.title}</h2>
            <p className={styles.cardContent}>{announcement.content}</p>

            <div className={styles.cardFooter}>
                <div className={styles.author}>
                    <div className={styles.authorAvatar}>
                        {announcement.author?.avatar_url ? (
                            <img src={announcement.author.avatar_url} alt="" />
                        ) : (
                            announcement.author?.full_name?.[0] || '?'
                        )}
                    </div>
                    <span>{announcement.author?.full_name || '不明'}</span>
                </div>

                {canEdit && (
                    <div className={styles.cardActions}>
                        <button
                            onClick={handleTogglePin}
                            className={styles.pinBtn}
                            title={announcement.is_pinned ? 'ピン留め解除' : 'ピン留め'}
                        >
                            {announcement.is_pinned ? '📌' : '📍'}
                        </button>
                        <Link
                            href={`/announcements/${announcement.id}/edit`}
                            className={styles.editBtn}
                        >
                            編集
                        </Link>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className={styles.deleteBtn}
                            >
                                削除
                            </button>
                        ) : (
                            <div className={styles.deleteConfirm}>
                                <span>本当に削除しますか？</span>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className={styles.cancelBtn}
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className={styles.confirmDeleteBtn}
                                >
                                    {deleting ? '削除中...' : '削除'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    )
}
