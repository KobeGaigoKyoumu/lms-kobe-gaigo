'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
    const [sessionData, setSessionData] = useState(null)
    const [statusData, setStatusData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function check() {
            try {
                // 1. Fetch Session Info (from server action if possible, but here client side for now, wait we need server data)
                // Let's just fetch status API which uses session
                const res = await fetch('/api/status', { cache: 'no-store' })
                const data = await res.json()
                setStatusData(data)

                // Fetch cookie/session via another way if needed, but status response implies session state
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        check()
    }, [])

    return (
        <div style={{ padding: 20, fontFamily: 'monospace' }}>
            <h1>Debug Info</h1>
            {loading && <p>Loading...</p>}

            <h2>Status API Response</h2>
            <pre style={{ background: '#eee', padding: 10 }}>
                {JSON.stringify(statusData, null, 2)}
            </pre>

            <p>If unsubmittedAssignmentCount is 0, check ClassName and StudentID.</p>
        </div>
    )
}
