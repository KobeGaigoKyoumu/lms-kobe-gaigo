'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import styles from './page.module.css'
import { deleteAnnouncement } from '@/app/actions/announcements'

export default function AnnouncementCard({ announcement, canEdit }) {
    const router = useRouter()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)

        const result = await deleteAnnouncement(announcement.id)

        if (!result.success) {
            alert(`削除に失敗しました: ${result.error}`)
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

            {announcement.file_urls && announcement.file_urls.length > 0 && (
                <div className={styles.attachments}>
                    {announcement.file_urls.map((file, index) => (
                        <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.attachmentItem}
                            title={file.name}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <span>{file.name}</span>
                        </a>
                    ))}
                </div>
            )}

            <div className={styles.cardFooter}>
                <div className={styles.author}>
                    <div className={styles.authorAvatar}>
                        {announcement.author?.avatar_url ? (
                            <img src={announcement.author.avatar_url} alt="" />
                        ) : (
                            (announcement.sender_name || announcement.admin_author_name || announcement.author?.full_name)?.[0] || '?'
                        )}
                    </div>
                    <span>
                        {announcement.sender_name || announcement.admin_author_name || announcement.author?.full_name || '教務'}
                    </span>
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
