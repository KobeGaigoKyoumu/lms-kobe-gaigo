/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/(.*).(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  outputFileTracingIncludes: {
    '/api/career/download-survey': ['./public/templates/全学生進路希望調査票2025.xlsx'],
  },
};

export default nextConfig;
