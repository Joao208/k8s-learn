import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/sandbox/:path*",
        destination: "http://localhost:3001/sandbox/:path*",
      },
    ];
  },
};

export default nextConfig;
