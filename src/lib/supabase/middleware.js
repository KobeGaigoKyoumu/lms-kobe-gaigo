import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // セッションを更新
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 未認証ユーザーを login にリダイレクト（公開ページを除く）
    // NOTE: /student 配下は独自の認証（student_session cookie）を使用するため、ここではリダイレクトしない
    const publicPaths = ['/login', '/auth/callback']
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isStudentPath = request.nextUrl.pathname.startsWith('/student')

    if (!user && !isPublicPath && !isStudentPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
