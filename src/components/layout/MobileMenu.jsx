'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getMenuItems } from '@/lib/menuItems.jsx'
import styles from './MobileMenu.module.css'

export default function MobileMenu({ role }) {
    const pathname = usePathname()
    const menuItems = getMenuItems(role)

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
                        </div>
                        <span className={styles.label}>{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
