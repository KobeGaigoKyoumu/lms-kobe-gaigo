'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMenuItems } from '@/lib/menuItems.jsx'
import styles from './MobileMenu.module.css'

export default function MobileMenu({ role }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const menuItems = getMenuItems(role)
    const [unreadCount, setUnreadCount] = React.useState(0)

    React.useEffect(() => {
        const fetchUnreadCount = async () => {
            // Since we don't have user object here easily, we fetch session first or rely on prop
            // Assuming we need to fetch user session metadata for counts
            const { data: { user: authUser } } = await supabase.auth.getUser()

            let studentId = null
            if (role === 'student') {
                // For students, we might need to get their studentId from a different source
                // but usually it's in a cookie session. For now, let's try to get it if possible.
                // In StudentLayout, it's passed. In MobileMenu, we might need a better way.
                // Let's assume the session logic as in Chat API.
                const { data: student } = await supabase
                    .from('students')
                    .select('student_id_text')
                    .eq('email', authUser?.email)
                    .single()
                studentId = student?.student_id_text
            }

            let countQuery = supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('read', false)

            if (role === 'student' && studentId) {
                countQuery = countQuery.eq('student_id', studentId).eq('sender_type', 'teacher')
            } else if (role !== 'student') {
                countQuery = countQuery.eq('sender_type', 'student')
            } else {
                return // Cannot determine student context
            }

            const { count, error } = await countQuery
            if (!error) setUnreadCount(count || 0)
        }

        fetchUnreadCount()
        const channel = supabase
            .channel('mobile-unread')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnreadCount)
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [role, supabase])

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
