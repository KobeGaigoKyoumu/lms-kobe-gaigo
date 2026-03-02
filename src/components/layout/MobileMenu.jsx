'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMenuItems } from '@/lib/menuItems.jsx'
import { useStudentStatus } from '@/context/StudentStatusContext'
import styles from './MobileMenu.module.css'

export default function MobileMenu({ role, userId, userName, userEmail }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const menuItems = getMenuItems(role)

    const statuses = useStudentStatus()

    const handleLogout = async () => {
        if (role === 'student') {
            const { logoutStudent } = await import('@/app/actions/studentAuth')
            await logoutStudent()
        } else if (userEmail?.endsWith('@member')) {
            const { logoutAdminMember } = await import('@/app/actions/adminAuth')
            await logoutAdminMember()
        } else {
            await supabase.auth.signOut()
            window.location.href = '/login'
        }
    }

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
                    console.log('MobileMenu Homework Badge:', { count, statuses })
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
