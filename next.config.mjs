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
    '/api/career/download-survey': ['./src/templates/career_survey_template_2025.xlsx'],
  },
};

export default nextConfig;
