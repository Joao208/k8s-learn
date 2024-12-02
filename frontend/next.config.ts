import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/sandbox/:path*",
        destination: "https://k8s-learn.joaobarros.dev/api/sandbox/:path*",
      },
    ];
  },
};

export default nextConfig;
