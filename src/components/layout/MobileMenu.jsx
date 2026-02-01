'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getMenuItems } from '@/lib/menuItems.jsx'
import styles from './MobileMenu.module.css'

export default function MobileMenu({ role }) {
    const menuItems = getMenuItems(role)

    return (
        <div className={styles.mobileMenu}>
            {menuItems.map((item) => (
                <Link key={item.href} href={item.href} className={styles.menuItem}>
                    <div className={styles.iconWrapper}>
                        {item.icon}
                    </div>
                    <span className={styles.label}>{item.label}</span>
                </Link>
            ))}
        </div>
    )
}
