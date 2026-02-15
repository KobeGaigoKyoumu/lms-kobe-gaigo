'use client'

import { useState, useEffect } from 'react'
import { getSessionDebug } from '@/app/actions/debug'

export default function DebugPage() {
    const [debugInfo, setDebugInfo] = useState(null)
    const [statusData, setStatusData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function check() {
            try {
                // 1. Fetch Session Debug Info
                const info = await getSessionDebug()
                setDebugInfo(info)

                // 2. Fetch Status API
                const res = await fetch('/api/status', { cache: 'no-store' })
                const data = await res.json()
                setStatusData(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        check()
    }, [])

    return (
        <div style={{ padding: 20, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <h1>Debug Info</h1>
            {loading && <p>Loading...</p>}

            <h2>Session Data (Server)</h2>
            <pre style={{ background: '#eee', padding: 10, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(debugInfo, null, 2)}
            </pre>

            <h2>Status API Response</h2>
            <pre style={{ background: '#eef', padding: 10 }}>
                {JSON.stringify(statusData, null, 2)}
            </pre>
        </div>
    )
}
