import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ── Hardening ─────────────────────────────────────────────── */
  poweredByHeader: false, // don't advertise the framework
  reactStrictMode: true,

  /* ── Images ────────────────────────────────────────────────── */
  // Dish photos are served from Cloudinary (res.cloudinary.com) and are
  // piped through next/image for resizing, WebP/AVIF and lazy loading.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  /* ── DX ────────────────────────────────────────────────────── */
  // Fail builds on type/lint errors — a green main branch stays green.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
