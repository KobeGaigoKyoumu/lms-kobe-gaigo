import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Skip all static files and PWA assets:
         * - _next/static, _next/image
         * - favicon.ico, manifest.json, sw.js
         * - PWA icons (icon-192.png, icon-512.png)
         * - Standard image extensions
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
