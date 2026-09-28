import type { NextConfig } from "next";

const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow larger payloads for server actions (image upload)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // or '5mb', '20mb'
    },
  },
  images: {
    // Disable Next.js image optimization to avoid exceeding Vercel free tier.
    // Images are served from Cloudflare R2 and other remote patterns.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thejwel.com",
      },
      {
        protocol: "https",
        hostname: "battulaaljewels.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.thejwel.in",
      },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost }] : []),
    ],
  },
};

export default nextConfig;
