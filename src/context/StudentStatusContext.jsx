'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const StudentStatusContext = createContext({
    hasNewAnnouncement: false,
    unsubmittedAssignmentCount: 0,
    unreadMessageCount: 0,
    refreshStatus: () => { }
})

export function StudentStatusProvider({ children, role, userId }) {
    const [mounted, setMounted] = React.useState(false)
    const [statuses, setStatuses] = useState({
        hasNewAnnouncement: false,
        unsubmittedAssignmentCount: 0,
        unreadMessageCount: 0
    })
    const supabase = createClient()

    const lastFetchRef = React.useRef(0)
    const CACHE_KEY = `lms_status_cache_${role}_${userId || 'anon'}`
    const TTL = 300000 // 5 minutes cache
    const THROTTLE = 30000 // 30 seconds for real-time trigger

    const normalizeStatuses = (data) => {
        if (!data) return statuses;
        return {
            hasNewAnnouncement: !!(data.hasNewAnnouncement ?? data.has_new_announcement),
            unsubmittedAssignmentCount: Number(data.unsubmittedAssignmentCount ?? data.unsubmitted_assignment_count ?? 0),
            unreadMessageCount: Number(data.unreadMessageCount ?? data.unread_message_count ?? 0)
        };
    };

    const fetchStatuses = async (type = 'regular') => {
        if (!userId || !role) return

        const now = Date.now()
        // Allow forced refresh or throttled refresh
        if (type === 'realtime' && (now - lastFetchRef.current < THROTTLE)) return
        if (type === 'regular' && (now - lastFetchRef.current < 5000)) return

        try {
            let workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL
            let success = false

            if (workerUrl) {
                if (!workerUrl.startsWith('http')) {
                    workerUrl = `https://${workerUrl}`
                }
                const query = new URLSearchParams({
                    action: 'get-status',
                    role: role,
                    studentId: userId || '',
                    className: '',
                    academicYear: ''
                }).toString();

                try {
                    const res = await fetch(`${workerUrl}?${query}`)
                    if (res.ok) {
                        const data = await res.json()
                        // Ensure required fields exist
                        if (data && typeof data === 'object') {
                            const normalized = normalizeStatuses(data);
                            setStatuses(prev => ({ ...prev, ...normalized }))
                            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: normalized, ts: now }))
                            lastFetchRef.current = now
                            success = true
                        }
                    }
                } catch (workerErr) {
                    console.warn('Worker status fetch failed, falling back...', workerErr)
                }
            }

            if (!success) {
                const resInternal = await fetch('/api/status', { cache: 'no-store' })
                if (resInternal.ok) {
                    const data = await resInternal.json()
                    const normalized = normalizeStatuses(data);
                    setStatuses(prev => ({ ...prev, ...normalized }))
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: normalized, ts: now }))
                    lastFetchRef.current = now
                }
            }
        } catch (error) {
            console.error('Failed to fetch status:', error)
        }
    }

    // Hydrate from cache on mount
    useEffect(() => {
        setMounted(true)
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
            try {
                const { data, ts } = JSON.parse(cached)
                if (Date.now() - ts < TTL) {
                    setStatuses(normalizeStatuses(data))
                    lastFetchRef.current = ts
                }
            } catch (e) { }
        }
    }, [CACHE_KEY])

    useEffect(() => {
        if (!mounted) return
        if ('setAppBadge' in navigator && statuses.unreadMessageCount !== undefined) {
            navigator.setAppBadge(statuses.unreadMessageCount || 0).catch(e => console.error('Badge Error:', e))
        }
    }, [statuses.unreadMessageCount, mounted])

    // Initial fetch and periodic refresh
    useEffect(() => {
        if (!mounted || !role || !userId) return

        // 1. Initial hydration from cache (done in another useEffect, but ensure we fetch fresh)
        fetchStatuses('regular')

        // 2. Periodic background refresh (every 5 mins)
        const refreshInterval = setInterval(() => {
            fetchStatuses('regular')
        }, 300000)

        // 3. Re-fetch on visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatuses('regular')
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // 4. Real-time updates subscription
        const channel = supabase
            .channel(`status-server-${role}-${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages'
            }, () => fetchStatuses('realtime'))
            .subscribe()

        return () => {
            clearInterval(refreshInterval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            supabase.removeChannel(channel)
        }
    }, [role, userId, supabase, mounted])

    const contextValue = React.useMemo(() => ({
        ...statuses,
        refreshStatus: fetchStatuses
    }), [statuses, role, userId]) // Include deps that affect fetchStatuses closure

    if (!mounted) {
        return (
            <StudentStatusContext.Provider value={{
                hasNewAnnouncement: false,
                unsubmittedAssignmentCount: 0,
                unreadMessageCount: 0,
                refreshStatus: () => { }
            }}>
                {children}
            </StudentStatusContext.Provider>
        )
    }

    return (
        <StudentStatusContext.Provider value={contextValue}>
            {children}
        </StudentStatusContext.Provider>
    )
}

export const useStudentStatus = () => useContext(StudentStatusContext)
