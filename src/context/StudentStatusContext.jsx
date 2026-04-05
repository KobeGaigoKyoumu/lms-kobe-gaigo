'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const StudentStatusContext = createContext({
    hasNewAnnouncement: false,
    unsubmittedAssignmentCount: 0,
    unreadMessageCount: 0,
    userId: null,
    role: null,
    refreshStatus: () => { }
})

export function StudentStatusProvider({ children, role, userId, className: userClassName }) {
    const [mounted, setMounted] = React.useState(false)
    const [statuses, setStatuses] = useState({
        hasNewAnnouncement: false,
        unsubmittedAssignmentCount: 0,
        unreadMessageCount: 0
    })
    const supabase = createClient()

    const lastFetchRef = React.useRef(0)
    const CACHE_KEY = `lms_status_cache_v3_${role}_${userId || 'anon'}`
    const TTL = 300000 // 5 minutes cache
    const THROTTLE = 60000 // 60 seconds for real-time trigger

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

            // Try Worker first (0 CPU on Vercel)
            if (workerUrl && role === 'student') {
                if (!workerUrl.startsWith('http')) {
                    workerUrl = `https://${workerUrl}`
                }
                const query = new URLSearchParams({
                    action: 'get-status',
                    role: role,
                    studentId: userId || '',
                    className: userClassName || '',
                    academicYear: ''
                }).toString();

                try {
                    const res = await fetch(`${workerUrl}?${query}`, { signal: AbortSignal.timeout(5000) })
                    if (res.ok) {
                        const data = await res.json()
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

            // Fallback to internal API (Only if Worker failed and not on short cooldown)
            // Use a specific ref to avoid hammering Vercel if it's already struggling
            if (!success) {
                // If student, try direct RPC to save Vercel CPU
                if (role === 'student' || role === 'teacher' || role === 'admin') {
                    const lastFallback = parseInt(sessionStorage.getItem('last_status_fallback') || '0')
                    if (now - lastFallback < 15000) { // 15 seconds cooldown for direct RPC
                        console.log('Direct status fallback on cooldown')
                        return
                    }

                    // Use appropriate RPC or direct query for status
                    let data = null
                    if (role === 'student') {
                        const { data: rpcResult, error: rpcError } = await supabase
                            .rpc('get_student_status', {
                                p_student_id: userId,
                                p_class_name: userClassName || ''
                            })
                        if (!rpcError && rpcResult) {
                            data = {
                                hasNewAnnouncement: rpcResult.has_new_announcement || false,
                                unsubmittedAssignmentCount: rpcResult.unsubmitted_assignment_count || 0,
                                unreadMessageCount: rpcResult.unread_message_count || 0
                            }
                        }
                    } else {
                        // For teacher/admin, we can use a direct query to get unread count to save Vercel CPU
                        // And skip the complex dashboard stats here as they are shown on the dashboard page anyway
                        
                        // Validate UUID format before querying to avoid "invalid input syntax for type uuid"
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        if (userId && uuidRegex.test(userId)) {
                            const { count: unreadCount, error: countError } = await supabase
                                .from('messages')
                                .select('*', { count: 'exact', head: true })
                                .eq('teacher_id', userId)
                                .eq('read', false)
                            
                            if (countError) {
                                console.error('Status check query error:', countError);
                            }

                            data = {
                                hasNewAnnouncement: false, // Will be fetched on dashboard
                                unsubmittedAssignmentCount: 0,
                                unreadMessageCount: unreadCount || 0
                            }
                        } else {
                            // Non-UUID user (e.g. "member" or "undefined")
                            data = {
                                hasNewAnnouncement: false,
                                unsubmittedAssignmentCount: 0,
                                unreadMessageCount: 0
                            }
                        }
                    }

                    if (data) {
                        const normalized = normalizeStatuses(data);
                        setStatuses(prev => ({ ...prev, ...normalized }))
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: normalized, ts: now }))
                        sessionStorage.setItem('last_status_fallback', now.toString())
                        lastFetchRef.current = now
                        success = true
                    }
                }

                // Vercel fallback removed to save CPU as per optimization plan
                /*
                if (!success && typeof window !== 'undefined') {
                    ...
                }
                */
            }
        } catch (error) {
            console.error('Failed to fetch status:', error)
        }
    }

    // Hydrate from cache on mount
    useEffect(() => {
        setMounted(true)
        
        if (typeof window === 'undefined') return

        const cached = window.sessionStorage.getItem(CACHE_KEY)
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

        // 2. Periodic background refresh (every 10 mins)
        const refreshInterval = setInterval(() => {
            fetchStatuses('regular')
        }, 600000)

        // 3. Re-fetch on visibility change (Throttled)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now()
                if (now - lastFetchRef.current > 30000) { // 30 seconds throttle for visibility change
                    fetchStatuses('regular')
                }
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(refreshInterval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [role, userId, supabase, mounted])

    const contextValue = React.useMemo(() => ({
        ...statuses,
        role,
        userId,
        refreshStatus: (type = 'regular') => fetchStatuses(type)
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
