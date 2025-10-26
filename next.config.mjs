/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove dangerous flags - catch errors early!
  eslint: {
    dirs: ["app", "components", "lib", "hooks"], // Only check app code
  },

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mongodb.com",
      },
    ],
  },

  // Optimize TensorFlow loading
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ["@radix-ui/react-*", "recharts", "lucide-react"],
  },
};

export default nextConfig;
