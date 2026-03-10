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
        const response = await fetch(`${SUPABASE_URL}/functions/v1/kanban-reminders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: '{}'
        })

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Kanban Reminder Forward Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
