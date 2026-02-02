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

    // Verify Supabase session (Admin/Teacher)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected paths
    const publicPaths = ['/login', '/auth/callback']
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isStudentPath = request.nextUrl.pathname.startsWith('/student')
    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks')

    // Check for ANY version of student session
    // v2 is our new Base64 hardened cookie
    const hasStudentSession =
        request.cookies.has('kobe_student_session_v2') ||
        request.cookies.has('kobe_student_session_v1') ||
        request.cookies.has('student_id_session')

    // If NOT authenticated by Supabase AND NOT by our student cookie AND on a protected path
    if (!user && !hasStudentSession && !isPublicPath && !isStudentPath && !isWebhook) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
