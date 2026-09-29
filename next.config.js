/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the "X-Powered-By: Next.js" header — this leaks framework/version
  // info that attackers use to look up known CVEs for your exact stack.
  poweredByHeader: false,

  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
  // Increase body size limit for video uploads (default is 4.5MB which
  // is too small for video files — this raises it to 110MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '110mb',
    },
  },
}

module.exports = nextConfig
