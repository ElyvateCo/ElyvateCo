/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the "X-Powered-By: Next.js" header — this leaks framework/version
  // info that attackers use to look up known CVEs for your exact stack.
  poweredByHeader: false,

  reactStrictMode: true,

  images: {
    // Merchants paste photo LINKS from any website, so Next.js can't have an
    // allow-list of image hosts. Serving the links as-is (no Vercel image
    // optimizer) also avoids optimizer limits/costs on the free plan.
    unoptimized: true,
  },
}

module.exports = nextConfig
