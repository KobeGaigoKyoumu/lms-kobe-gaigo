import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.json / manifest.webmanifest (PWA manifest)
         * - sw.js (Service Worker)
         * - icon-192.png / icon-512.png (PWA icons)
         * - all image extensions (svg, png, jpg, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js|icon-192\\.png|icon-512\\.png|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
