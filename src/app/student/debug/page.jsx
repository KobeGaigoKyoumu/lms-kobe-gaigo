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

            <h2>Assignment Stats (Database)</h2>
            <pre style={{ background: '#eef', padding: 10 }}>
                {JSON.stringify(debugInfo?.assignmentStats, null, 2)}
            </pre>

            <div style={{ margin: '20px 0', padding: '15px', border: '2px dashed #f59e0b', borderRadius: '8px' }}>
                <h3>🛠 Troubleshooting Action</h3>
                <p>Assignments are missing because there are <strong>0 assignments</strong> in the database for class "{debugInfo?.session?.className}".</p>
                <button
                    onClick={async () => {
                        if (!confirm('Create a test assignment for class "' + debugInfo?.session?.className + '"?')) return;
                        setLoading(true);
                        try {
                            const { createTestAssignment } = await import('@/app/actions/debug');
                            const res = await createTestAssignment(debugInfo?.session?.className);
                            if (res.success) {
                                alert('Success! Please reload the page.');
                                window.location.reload();
                            } else {
                                alert('Error: ' + res.error);
                            }
                        } catch (e) { alert(e.message); }
                        setLoading(false);
                    }}
                    style={{
                        padding: '10px 20px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    + Create Test Assignment for "{debugInfo?.session?.className}"
                </button>
            </div>

            <h2>Status API Response</h2>
            <pre style={{ background: '#eee', padding: 10 }}>
                {JSON.stringify(statusData, null, 2)}
            </pre>
        </div>
    )
}
