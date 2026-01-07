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
            // 認証成功 → ユーザー情報取得
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // 学生マスターテーブルからメールアドレスで照合
                const { data: studentMaster } = await supabase
                    .from('students')
                    .select('student_id_text, full_name, class_name')
                    .eq('email', user.email)
                    .eq('status', 'active')
                    .single()

                if (studentMaster) {
                    // マスターに存在する場合、プロファイルを更新
                    await supabase
                        .from('profiles')
                        .update({
                            student_id_text: studentMaster.student_id_text,
                            full_name: studentMaster.full_name,
                            role: 'student',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user.id)
                }
            }

            // ログイン成功 → ダッシュボードへリダイレクト
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // エラー時はログインページへ
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

