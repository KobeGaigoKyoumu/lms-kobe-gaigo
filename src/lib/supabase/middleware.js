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

    // Verify session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const publicPaths = ['/login', '/auth/callback']
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isStudentPath = request.nextUrl.pathname.startsWith('/student')
    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks')

    // Check for NEW cookie name 'student_id_session'
    const studentSession = request.cookies.get('student_id_session')

    // Also check for OLD cookie name to avoid immediate logouts for users during transition
    const oldStudentSession = request.cookies.get('student_session')
    const hasAnyStudentSession = studentSession || oldStudentSession

    if (!user && !isPublicPath && !isStudentPath && !isWebhook && !hasAnyStudentSession) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
