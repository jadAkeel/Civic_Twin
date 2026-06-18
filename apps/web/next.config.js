/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
};

module.exports = nextConfig;
