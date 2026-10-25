import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true, // Automatically registers the service worker
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
