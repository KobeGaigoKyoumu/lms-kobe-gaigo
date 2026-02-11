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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

    // Verify Supabase session (Admin/Teacher)
    // SKIP for auth callback to avoid PKCE cookie issues
    let user = null
    const isCallback = request.nextUrl.pathname.startsWith('/auth/callback')

    if (!isCallback) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        user = authUser
    }

    // Protected paths
    const publicPaths = ['/login', '/auth/callback']
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isStudentPath = request.nextUrl.pathname.startsWith('/student')
    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks')

    const studentSession = request.cookies.get('kobe_student_session_v2') ||
        request.cookies.get('kobe_student_session_v1') ||
        request.cookies.get('student_id_session')

    // Redirect to login if NO student session AND NO Supabase user exists for a student path
    if (isStudentPath && !studentSession && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
        return NextResponse.redirect(url)
    }

    const isChatApi = request.nextUrl.pathname.startsWith('/api/chat')

    // Redirect to login if NO Supabase session exists and it's an admin/teacher path
    if (!user && !isPublicPath && !isStudentPath && !isWebhook && !isChatApi) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
