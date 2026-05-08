/**
 * Common utility functions for the LMS application.
 * Note: Avoid using 'use server' here if you need synchronous helpers.
 */

export const normalizeClassName = (name) => {
    if (!name) return ''
    return typeof name === 'string' 
        ? name.trim()
            .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
            .replace(/[Ａ-Ｚａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
            .replace(/[－ー—―‐−–—]/g, '-')
            .replace(/\s+/g, '') // Remove internal spaces for robust matching
            .toLowerCase()
        : name
}

/**
 * Supabase の画像 URL を CDN (Cloudflare など) の URL に書き換える
 * @param {string} url - 元の URL (supabase.co/storage/v1/object/public/...)
 * @returns {string} - CDN URL または元の URL
 */
export const toCDNUrl = (url) => {
    if (!url || typeof url !== 'string') return url
    
    const cdnUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_URL
    if (!cdnUrl) return url

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return url

    try {
        const urlObj = new URL(url)
        const supabaseUrlObj = new URL(supabaseUrl)

        // Supabase のストレージパス (/storage/v1/object/public/) を含む場合のみ変換
        if (urlObj.hostname === supabaseUrlObj.hostname && urlObj.pathname.includes('/storage/v1/object/public/')) {
            const cdnUrlObj = new URL(cdnUrl)
            urlObj.protocol = cdnUrlObj.protocol
            urlObj.host = cdnUrlObj.host
            return urlObj.toString()
        }
    } catch (e) {
        // Not a valid URL, return as is
    }

    return url
}
