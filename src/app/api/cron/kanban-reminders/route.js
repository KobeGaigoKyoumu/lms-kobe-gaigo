import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// このエンドポイントはSupabase Edge Functionにオフロード済み
// GitHub Actionsが直接Edge Functionを呼び出すため、Vercelでの処理は不要
// 手動テスト用にフォワード機能のみ残す
export async function GET(request) {
    const CRON_SECRET = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
        console.log('[CRON] Forwarding to Supabase Edge Function:', `${SUPABASE_URL}/functions/v1/kanban-reminders`)
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/kanban-reminders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ triggered_at: new Date().toISOString() })
        })

        console.log('[CRON] Edge Function Response Status:', response.status)

        let data = {}
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
            data = await response.json()
        } else {
            const text = await response.text()
            console.log('[CRON] Edge Function non-JSON response:', text)
            data = { message: text }
        }

        console.log('[CRON] Edge Function Response Data:', data)
        return NextResponse.json({ 
            success: response.ok,
            status: response.status,
            data 
        })
    } catch (error) {
        console.error('[CRON] Kanban Reminder Forward Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
