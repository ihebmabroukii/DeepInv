/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/soc-api/:path*',
        destination: 'http://127.0.0.1:8001/:path*',
      },
    ]
  },
}

export default nextConfig
