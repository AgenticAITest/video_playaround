import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "ws", "@ngrok/ngrok"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8188",
      },
    ],
  },
};

export default nextConfig;
