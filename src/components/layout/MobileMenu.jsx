'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMenuItems } from '@/lib/menuItems.jsx'
import { useStudentStatus } from '@/context/StudentStatusContext'
import styles from './MobileMenu.module.css'

export default function MobileMenu({ role, user }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const menuItems = getMenuItems(role)

    // Use Context for student, local state for others
    const contextStatuses = useStudentStatus()
    const [localStatuses, setLocalStatuses] = React.useState({
        hasNewAnnouncement: false,
        unsubmittedAssignmentCount: 0,
        unreadMessageCount: 0
    })

    const statuses = role === 'student' ? contextStatuses : localStatuses

    React.useEffect(() => {
        if (role === 'student') return

        const fetchStatuses = async () => {
            try {
                let CLOUDFLARE_WORKER_URL = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
                if (!CLOUDFLARE_WORKER_URL) {
                    const { getAppNewStatus } = require('@/app/actions/statusActions')
                    const data = await getAppNewStatus()
                    setLocalStatuses(data)
                    return
                }

                if (!CLOUDFLARE_WORKER_URL.startsWith('http')) {
                    CLOUDFLARE_WORKER_URL = `https://${CLOUDFLARE_WORKER_URL}`;
                }

                const query = new URLSearchParams({
                    action: 'get-status',
                    role: role
                }).toString();

                const res = await fetch(`${CLOUDFLARE_WORKER_URL}?${query}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                })
                if (res.ok) {
                    const data = await res.json()
                    setLocalStatuses(data)
                }
            } catch (e) {
                console.error('Mobile menu status fetch error:', e)
            }
        }
        fetchStatuses()

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatuses()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        let channel
        channel = supabase
            .channel('mobile-unread')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchStatuses)
            .subscribe()

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (channel) supabase.removeChannel(channel)
        }
    }, [role, user, supabase])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    React.useEffect(() => {
        if ('setAppBadge' in navigator && statuses.unreadMessageCount !== undefined) {
            navigator.setAppBadge(statuses.unreadMessageCount || 0).catch(e => console.error(e))
        }
    }, [statuses.unreadMessageCount])

    if (!role) return null

    return (
        <nav className={styles.mobileMenu}>
            {menuItems.map((item) => {
                const isActive = pathname === item.href
                const isCommunication = item.href.includes('communication')
                const isAnnouncement = item.href.includes('announcements')
                const isHomework = item.href.includes('homework')

                let showShimmer = false
                let count = 0

                if (isCommunication) {
                    showShimmer = statuses.unreadMessageCount > 0
                    count = statuses.unreadMessageCount
                } else if (isAnnouncement) {
                    showShimmer = statuses.hasNewAnnouncement
                } else if (isHomework) {
                    showShimmer = statuses.unsubmittedAssignmentCount > 0
                    count = statuses.unsubmittedAssignmentCount
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.menuItem} ${isActive ? styles.active : ''} ${showShimmer ? styles.shineEffect : ''}`}
                    >
                        <div
                            className={styles.iconWrapper}
                            style={{ color: item.color }}
                        >
                            {item.icon}
                            {count > 0 && (
                                <span className={styles.badge}>{count}</span>
                            )}
                        </div>
                        <span className={styles.label}>{item.label}</span>
                    </Link>
                )
            })}

            <button
                onClick={handleLogout}
                className={styles.menuItem}
                type="button"
            >
                <div
                    className={styles.iconWrapper}
                    style={{ color: '#475569' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </div>
                <span className={styles.label}>ログアウト</span>
            </button>
        </nav>
    )
}
