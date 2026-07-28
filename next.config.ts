import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  logging: {
    incomingRequests: false,
  },
};

export default nextConfig;
