export default function manifest() {
    return {
        name: 'LMS 神戸外語',
        short_name: 'LMS',
        description: '神戸外語 LMS Application',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        icons: [
            {
                src: '/vercel.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any maskable',
            },
        ],
    }
}
