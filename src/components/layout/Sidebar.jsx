'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logoutStudent } from '@/app/actions/studentAuth'
import styles from './Sidebar.module.css'

const menuItems = [
    {
        href: '/',
        label: 'ダッシュボード',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="11" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="11" width="6" height="6" rx="1" />
                <rect x="11" y="11" width="6" height="6" rx="1" />
            </svg>
        )
    },
    {
        href: '/courses',
        label: 'コース',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5h12M4 10h12M4 15h8" />
            </svg>
        )
    },
    {
        href: '/classes',
        label: 'クラス',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="7" r="3" />
                <path d="M4 17v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
            </svg>
        )
    },
    {
        href: '/assignments',
        label: '課題',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="7" y="2" width="6" height="4" rx="1" />
            </svg>
        )
    },
    {
        href: '/grades',
        label: '課題評価',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <path d="M7 12l2 2 4-4" />
            </svg>
        )
    },
    {
        href: '/report-cards',
        label: '成績',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 17V7l7-5 7 5v10" />
                <path d="M7 17v-6h6v6" />
            </svg>
        )
    },
    {
        href: '/calendar',
        label: 'カレンダー',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="14" height="13" rx="2" />
                <path d="M3 8h14M7 2v4M13 2v4" />
            </svg>
        )
    },
    {
        href: '/announcements',
        label: 'お知らせ',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M3 6l7-4 7 4" />
                <path d="M10 10v4" />
            </svg>
        )
    },
    {
        href: '/settings',
        label: '設定',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
            </svg>
        )
    },
]

export default function Sidebar({ user, role: userRole, dashboardHref: propDashboardHref }) {
    const pathname = usePathname()
    const supabase = createClient()
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '260px')
    }, [isCollapsed])

    /* Removed: Client-side fetch is no longer needed
    useEffect(() => {
        const fetchUserRole = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user?.id)
                .single()
            setUserRole(data?.role)
        }
        if (user) {
            fetchUserRole()
        }
    }, [user])
    */

    // Build menu items based on role
    const getMenuItems = () => {
        // Base items with dynamic dashboard link
        const dashboardHref = propDashboardHref || (userRole === 'student' ? '/student/dashboard' : '/')

        const baseItems = [
            {
                href: dashboardHref,
                label: 'ダッシュボード',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="6" height="6" rx="1" />
                        <rect x="11" y="3" width="6" height="6" rx="1" />
                        <rect x="3" y="11" width="6" height="6" rx="1" />
                        <rect x="11" y="11" width="6" height="6" rx="1" />
                    </svg>
                )
            }
        ]

        // Student-specific items
        if (userRole === 'student') {
            return [
                ...baseItems,
                {
                    href: '/student/grades',
                    label: '成績確認',
                    icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <path d="M7 12l2 2 4-4" />
                        </svg>
                    )
                },
                {
                    href: '/student/attendance',
                    label: '出席率',
                    icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <path d="M9 16l2 2 4-4" />
                        </svg>
                    )
                },
                {
                    href: '/student/calendar',
                    label: 'カレンダー',
                    icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="4" width="14" height="13" rx="2" />
                            <path d="M3 8h14M7 2v4M13 2v4" />
                        </svg>
                    )
                },
                {
                    href: '/student/announcements',
                    label: 'お知らせ',
                    icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M3 6l7-4 7 4" />
                            <path d="M10 10v4" />
                        </svg>
                    )
                },
                {
                    href: '/student/settings',
                    label: '設定',
                    icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="10" cy="10" r="3" />
                            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
                        </svg>
                    )
                }
            ]
        }

        // Teacher/Admin items (default)
        return [
            ...baseItems,
            {
                href: '/courses',
                label: 'コース',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 5h12M4 10h12M4 15h8" />
                    </svg>
                )
            },
            {
                href: '/classes',
                label: 'クラス',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="7" r="3" />
                        <path d="M4 17v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
                    </svg>
                )
            },
            {
                href: '/admin/students',
                label: '学生マスター',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                )
            },
            {
                href: '/assignments',
                label: '課題',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <rect x="7" y="2" width="6" height="4" rx="1" />
                    </svg>
                )
            },
            {
                href: '/grades',
                label: '課題評価',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <path d="M7 12l2 2 4-4" />
                    </svg>
                )
            },
            {
                href: '/report-cards',
                label: '成績管理',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 17V7l7-5 7 5v10" />
                        <path d="M7 17v-6h6v6" />
                    </svg>
                )
            },
            {
                href: '/attendance',
                label: '出席率',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M9 16l2 2 4-4" />
                    </svg>
                )
            },
            {
                href: '/report-cards/analytics',
                label: '統計・分析',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M18 20V10" />
                        <path d="M12 20V4" />
                        <path d="M6 20V14" />
                    </svg>
                )
            },
            {
                href: '/calendar',
                label: 'カレンダー',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="4" width="14" height="13" rx="2" />
                        <path d="M3 8h14M7 2v4M13 2v4" />
                    </svg>
                )
            },
            {
                href: '/announcements',
                label: 'お知らせ',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M3 6l7-4 7 4" />
                        <path d="M10 10v4" />
                    </svg>
                )
            },
            {
                href: '/settings',
                label: '設定',
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="10" r="3" />
                        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
                    </svg>
                )
            }
        ]
    }

    const handleLogout = async () => {
        if (userRole === 'student') {
            await logoutStudent()
        } else {
            await supabase.auth.signOut()
            window.location.href = '/login'
        }
    }

    // ユーザーのイニシャル取得
    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }

    const displayName = user?.user_metadata?.full_name || user?.name || 'ユーザー'
    const displayDetail = user?.email || (user?.className ? `${user.className}` : '')
    const avatarUrl = user?.user_metadata?.avatar_url

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            {/* ロゴ */}
            <div className={styles.logo}>
                <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                    <rect width="48" height="48" rx="12" fill="url(#sidebarGradient)" />
                    <path d="M14 16H34V20H18V22H30V26H18V32H14V16Z" fill="white" />
                    <path d="M22 28H34V32H22V28Z" fill="white" opacity="0.7" />
                    <defs>
                        <linearGradient id="sidebarGradient" x1="0" y1="0" x2="48" y2="48">
                            <stop stopColor="#3B82F6" />
                            <stop offset="1" stopColor="#8B5CF6" />
                        </linearGradient>
                    </defs>
                </svg>
                <span>神戸外語 LMS</span>
            </div>

            <button
                className={styles.collapseBtn}
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "メニューを展開" : "メニューを折りたたむ"}
            >
                {isCollapsed ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                )}
            </button>

            {/* ナビゲーション */}
            <nav className={styles.nav}>
                {getMenuItems().map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* ユーザー情報 */}
            <div className={styles.userSection}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" />
                        ) : (
                            getInitials(displayName)
                        )}
                    </div>
                    <div className={styles.userDetails}>
                        <p className={styles.userName}>
                            {displayName}
                        </p>
                        <p className={styles.userEmail}>{displayDetail}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className={styles.logoutBtn} title="ログアウト">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
                        <path d="M12 12l3-3-3-3" />
                        <path d="M15 9H7" />
                    </svg>
                </button>
            </div>
        </aside>
    )
}
