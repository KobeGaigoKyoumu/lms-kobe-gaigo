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

        // 1. Check for sessions safely
        const hasStudentSession = !!(request.cookies.get('kobe_student_session_v2') || 
                                   request.cookies.get('kobe_student_session_v1') || 
                                   request.cookies.get('student_id_session'))
        
        const hasAdminSession = !!request.cookies.get('kobe_admin_member')

        // 2. Redirect logic
        if (isStudentPath && !hasStudentSession) {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('next', pathname)
            return NextResponse.redirect(redirectUrl)
        }

        if (!hasAdminSession && !isPublicPath && !isStudentPath && !isWebhook && !isChatApi) {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('next', pathname)
            return NextResponse.redirect(redirectUrl)
        }

        return supabaseResponse

    } catch (e) {
        console.error('Middleware Error:', e)
        return NextResponse.next()
    }
}
