import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Skip all static files, PWA assets, and API routes:
         * - _next/static, _next/image
         * - favicon.ico, manifest.json, sw.js
         * - PWA icons (icon-192.png, icon-512.png)
         * - Standard image extensions
         * - /api/* (API routes should handle their own auth or return 401 JSON)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|code_artifact.html|icon-192.png|icon-512.png|apple-touch-icon.png|favicon-32x32.png|favicon-16x16.png|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
