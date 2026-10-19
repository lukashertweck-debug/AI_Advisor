/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle for small Docker images / VPS deploy.
  output: "standalone",
};

export default nextConfig;
