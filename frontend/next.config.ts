import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/sandbox/:path*",
        destination: "https://k8s-learn.joaobarros.dev/api/sandbox/:path*",
        headers: {
          "X-Real-IP": "1",
          "X-Forwarded-For": "1",
          "X-Forwarded-Proto": "1",
          "X-Forwarded-Host": "1",
        },
      },
    ];
  },
};

export default nextConfig;
