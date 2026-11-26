import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: { cpus: 1 },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};
export default nextConfig;
