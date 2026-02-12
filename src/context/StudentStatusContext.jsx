'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getAppNewStatus } from '@/app/actions/statusActions'
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

    const fetchStatuses = async () => {
        try {
            const data = await getAppNewStatus()
            setStatuses(data)
        } catch (error) {
            console.error('Failed to fetch status:', error)
        }
    }

    useEffect(() => {
        if ('setAppBadge' in navigator && statuses.unreadMessageCount !== undefined) {
            navigator.setAppBadge(statuses.unreadMessageCount || 0).catch(e => console.error('Badge Error:', e))
        }
    }, [statuses.unreadMessageCount])

    useEffect(() => {
        // Initial fetch
        fetchStatuses()

        // Re-fetch on visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatuses()
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchStatuses)
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
