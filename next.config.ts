import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev", // Allows all Cloudflare R2 development subdomains
      },
    ],
  },
};

export default nextConfig;
