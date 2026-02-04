import React from 'react'

export const getMenuItems = (role) => {
    const isStudent = role === 'student'

    // Base items
    const baseItems = [
        {
            href: isStudent ? '/student/dashboard' : '/',
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

    // Student specific items
    if (isStudent) {
        return [
            ...baseItems.map(i => ({ ...i, color: '#3b82f6' })), // Dashboard Blue
            {
                href: '/student/grades',
                label: '成績確認',
                color: '#f59e0b', // Amber/Orange
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <path d="M7 12l2 2 4-4" />
                    </svg>
                )
            },
            {
                href: '/student/homework',
                label: '課題',
                color: '#ec4899', // Pink
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <rect x="7" y="2" width="6" height="4" rx="1" />
                    </svg>
                )
            },
            {
                href: '/student/attendance',
                label: '出席率',
                color: '#22c55e', // Green
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
                color: '#8b5cf6', // Purple
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
                color: '#ef4444', // Red
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M3 6l7-4 7 4" />
                        <path d="M10 10v4" />
                    </svg>
                )
            },
            {
                href: '/student/communication',
                label: 'メッセージ',
                color: '#0ea5e9', // Sky Blue
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                )
            },
            {
                href: '/student/profile',
                label: 'プロフィール',
                color: '#64748b', // Slate
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                )
            },
            {
                href: '/student/settings',
                label: '設定',
                color: '#64748b', // Slate
                icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="10" r="3" />
                        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
                    </svg>
                )
            }
        ]
    }

    // Teacher / Admin items
    return [
        {
            href: '/',
            label: 'ダッシュボード',
            color: '#3b82f6', // Blue
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
            color: '#6366f1', // Indigo
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 5h12M4 10h12M4 15h8" />
                </svg>
            )
        },
        {
            href: '/classes',
            label: 'クラス',
            color: '#8b5cf6', // Violet
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
            color: '#06b6d4', // Cyan
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
            color: '#ec4899', // Pink
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
            color: '#f43f5e', // Rose
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
            color: '#f97316', // Orange
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
            color: '#22c55e', // Green
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
            color: '#a855f7', // Purple
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
            color: '#eab308', // Yellow
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
            color: '#ef4444', // Red
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M3 6l7-4 7 4" />
                    <path d="M10 10v4" />
                </svg>
            )
        },
        {
            href: '/communication',
            label: 'コミュニケーション',
            color: '#0ea5e9', // Sky Blue
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            )
        },
        {
            href: '/settings',
            label: '設定',
            color: '#64748b', // Slate
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="10" cy="10" r="3" />
                    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
                </svg>
            )
        }
    ]
}
