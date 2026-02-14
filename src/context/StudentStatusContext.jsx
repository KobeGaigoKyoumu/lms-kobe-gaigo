'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const StudentStatusContext = createContext({
    hasNewAnnouncement: false,
    unsubmittedAssignmentCount: 0,
    unreadMessageCount: 0,
    refreshStatus: () => { }
})

export function StudentStatusProvider({ children, role, user }) {
    const [statuses, setStatuses] = useState({
        hasNewAnnouncement: false,
        unsubmittedAssignmentCount: 0,
        unreadMessageCount: 0
    })
    const supabase = createClient()

    const lastFetchRef = React.useRef(0)
    const CACHE_KEY = 'lms_student_status_cache'
    const TTL = 60000 // 60 seconds
    const THROTTLE = 10000 // 10 seconds for real-time

    const fetchStatuses = async (type = 'regular') => {
        const now = Date.now()
        const timeSinceLast = now - lastFetchRef.current

        // Fetch Guard
        if (type === 'regular' && timeSinceLast < TTL) return
        if (type === 'realtime' && timeSinceLast < THROTTLE) return

        try {
            let CLOUDFLARE_WORKER_URL = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
            if (!CLOUDFLARE_WORKER_URL) {
                const { getAppNewStatus } = await import('@/app/actions/statusActions')
                const data = await getAppNewStatus()
                setStatuses(data)
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: now }))
                lastFetchRef.current = now
                return
            }

            if (!CLOUDFLARE_WORKER_URL.startsWith('http')) {
                CLOUDFLARE_WORKER_URL = `https://${CLOUDFLARE_WORKER_URL}`;
            }

            const query = new URLSearchParams({
                action: 'get-status',
                role: role,
                studentId: user?.studentId || '',
                className: user?.className || '',
                academicYear: user?.academicYear || ''
            }).toString();

            const res = await fetch(`${CLOUDFLARE_WORKER_URL}?${query}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            })
            if (!res.ok) throw new Error('Status fetch failed')
            const data = await res.json()
            setStatuses(data)
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: now }))
            lastFetchRef.current = now
        } catch (error) {
            console.error('Failed to fetch status:', error)
        }
    }

    // Hydrate from cache on mount
    useEffect(() => {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
            try {
                const { data, ts } = JSON.parse(cached)
                if (Date.now() - ts < TTL * 5) { // Allow older cache for immediate display (5 mins)
                    setStatuses(data)
                    lastFetchRef.current = ts
                }
            } catch (e) {
                console.error('Cache hydration error:', e)
            }
        }
    }, [])

    useEffect(() => {
        if ('setAppBadge' in navigator && statuses.unreadMessageCount !== undefined) {
            navigator.setAppBadge(statuses.unreadMessageCount || 0).catch(e => console.error('Badge Error:', e))
        }
    }, [statuses.unreadMessageCount])

    useEffect(() => {
        // Initial fetch
        fetchStatuses('regular')

        // Re-fetch on visibility change (Guarded by TTL)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatuses('regular')
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Real-time updates for messages (if not student, though this provider is mainly for students?)
        // The original code had real-time for non-students.
        // If this context is used by students, we might want to keep the logic consistent.
        // However, the original code in Sidebar only subscribed if role !== 'student'.
        // Let's keep that logic.
        let channel
        if (role !== 'student') {
            channel = supabase
                .channel('status-updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchStatuses('realtime'))
                .subscribe()
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (channel) supabase.removeChannel(channel)
        }
    }, [role, supabase])

    return (
        <StudentStatusContext.Provider value={{ ...statuses, refreshStatus: fetchStatuses }}>
            {children}
        </StudentStatusContext.Provider>
    )
}

export const useStudentStatus = () => useContext(StudentStatusContext)
