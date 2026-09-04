import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1mb — too small for photo uploads (gallery media),
    // which go through a Server Action in components/gallery/UploadForm.tsx.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
