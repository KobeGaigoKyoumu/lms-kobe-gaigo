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

    // Supabase session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const publicPaths = ['/login', '/auth/callback']
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isStudentPath = request.nextUrl.pathname.startsWith('/student')
    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks')

    // Standardized student session cookie name
    const COOKIE_NAME = 'student_id_session'
    const studentSession = request.cookies.get(COOKIE_NAME)

    // Redirect to login if NO session exists and it's a protected path
    if (!user && !isPublicPath && !isStudentPath && !isWebhook && !studentSession) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Refresh student session expiration if it exists
    // This ensures the 1-year window moves forward as the user uses the app
    if (studentSession) {
        supabaseResponse.cookies.set(COOKIE_NAME, studentSession.value, {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 60 * 24 * 365,
            path: '/',
            sameSite: 'lax',
            priority: 'high'
        })
    }

    return supabaseResponse
}
