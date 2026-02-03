'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logoutStudent } from '@/app/actions/studentAuth'
import { getMenuItems } from '@/lib/menuItems.jsx'
import styles from './Sidebar.module.css'

export default function Sidebar({ user, role: userRole, dashboardHref: propDashboardHref, hideOnMobile = false }) {
    const pathname = usePathname()
    const supabase = createClient()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const menuItems = getMenuItems(userRole)

    useEffect(() => {
        // Prevent JS override if on mobile (handled by CSS)
        if (window.innerWidth > 768) {
            document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '200px')
        }
    }, [isCollapsed])

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
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${hideOnMobile ? styles.mobileHidden : ''}`}>
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
                {menuItems.map((item) => (
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
