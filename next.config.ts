import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger uploads for Server Actions (PDFs)
  serverActions: {
    // Use numeric bytes to avoid config parsing issues
    bodySizeLimit: 50 * 1024 * 1024,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
