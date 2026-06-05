/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  swSrc: "src/sw.js"
});

const nextConfig = {
  reactStrictMode: true
};

module.exports = withPWA(nextConfig);
