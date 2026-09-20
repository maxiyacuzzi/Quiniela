import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos de tickets (base64) desde el celular superan fácil el 1MB
    // por defecto de las Server Actions.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
