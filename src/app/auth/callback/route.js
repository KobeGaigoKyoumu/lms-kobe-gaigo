import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // ログイン成功 → ダッシュボードへリダイレクト
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // エラー時はログインページへ
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
