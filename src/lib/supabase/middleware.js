import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
    try {
        let supabaseResponse = NextResponse.next({
            request,
        })

        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

        if (!supabaseUrl || !supabaseKey) {
            return supabaseResponse;
        }

        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        } catch (e) { /* ignore */ }

                        supabaseResponse = NextResponse.next({
                            request,
                        })

                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                supabaseResponse.cookies.set(name, value, options)
                            )
                        } catch (e) { /* ignore */ }
                    },
                },
            }
        )

        // Expanded public paths to include common static files and PWA assets
        const publicPaths = [
            '/login',
            '/auth/callback',
            '/_next',
            '/favicon.ico',
            '/manifest.json',
            '/sw.js',
            '/icon-',
            '/sitemap.xml',
            '/robots.txt',
            '/assets/'
        ]

        const pathname = request.nextUrl.pathname
        const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) ||
            pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|json|xml|txt)$/)

        const isWebhook = pathname.startsWith('/api/webhooks')
        const isChatApi = pathname.startsWith('/api/chat')
        const isStudentPath = pathname.startsWith('/student')

        // Verify Supabase session (Admin/Teacher)
        let user = null

        // CRITICAL: Only call getUser() if it's NOT a public path, NOT a webhook, AND NOT an internal API
        // This is the most expensive part of the middleware in terms of CPU usage.
        if (!isPublicPath && !isWebhook && !isChatApi) {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            user = authUser
        }



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



        // Check for admin member session cookie
        const adminMemberSession = request.cookies.get('kobe_admin_member')

        // Redirect to login if NO Supabase session AND NO admin member session exists and it's an admin/teacher path
        if (!user && !adminMemberSession && !isPublicPath && !isStudentPath && !isWebhook && !isChatApi) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
            return NextResponse.redirect(url)
        }

        return supabaseResponse

    } catch (e) {
        console.error('CRITICAL: Middleware failed', e);
        return NextResponse.next({ request });
    }
}
