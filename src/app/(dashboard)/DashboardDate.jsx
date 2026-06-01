'use client'

import { useState, useEffect } from 'react'

export default function DashboardDate() {
    const [dateString, setDateString] = useState('')

    useEffect(() => {
        setDateString(
            new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            })
        )
    }, [])

    return <>{dateString}</>
}
