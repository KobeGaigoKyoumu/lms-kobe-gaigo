'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMenuItems } from '@/lib/menuItems.jsx'
import styles from './MobileMenu.module.css'

export default function MobileMenu({ role, user }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const menuItems = getMenuItems(role)
    const [unreadCount, setUnreadCount] = React.useState(0)

    React.useEffect(() => {
        const fetchUnreadCount = async () => {
            // For Admin/Teacher, use passed user object or auth.getUser if missing (though layout should pass it)
            // For Student, user object (session) is required for studentId

            let effectiveId = null
            if (role === 'student') {
                effectiveId = user?.studentId || user?.student_id_text
            }

            let countQuery = supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('read', false)

            if (role === 'student') {
                if (!effectiveId) return
                countQuery = countQuery.eq('student_id', effectiveId).eq('sender_type', 'teacher')
            } else {
                // Teachers/Admins count unread messages from students
                countQuery = countQuery.eq('sender_type', 'student')
            }

            const { count, error } = await countQuery
            if (!error) setUnreadCount(count || 0)
        }

        fetchUnreadCount()
        const channel = supabase
            .channel('mobile-unread')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnreadCount)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [role, user, supabase])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    if (!role) return null

    return (
        <nav className={styles.mobileMenu}>
            {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                    >
                        <div
                            className={styles.iconWrapper}
                            style={{ color: item.color }}
                        >
                            {item.icon}
                            {item.href.includes('communication') && unreadCount > 0 && (
                                <span className={styles.badge}>{unreadCount}</span>
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
