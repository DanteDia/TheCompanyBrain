import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The backend URL is read by client components from NEXT_PUBLIC_API_URL.
  // Never proxy through Next — we want the network call to be visible in the
  // browser dev tools for transparency during the demo.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
