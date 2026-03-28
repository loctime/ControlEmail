/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/icon.svg",
        permanent: false,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://controlfile.onrender.com/api/:path*",
      },
    ]
  },
}

export default nextConfig
