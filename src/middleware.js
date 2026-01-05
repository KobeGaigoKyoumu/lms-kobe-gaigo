import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * 以下のパスを除くすべてのリクエストにマッチ:
         * - _next/static (静的ファイル)
         * - _next/image (画像最適化)
         * - favicon.ico, sitemap.xml, robots.txt
         * - 画像ファイル
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
