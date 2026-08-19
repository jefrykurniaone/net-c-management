import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The OG card letters the community name in Archivo 900, and a custom face has
  // to reach `ImageResponse` as bytes — `next/font/google` hands over a CSS rule,
  // never the binary. The font is committed under `assets/fonts/` and read with
  // `readFile`; this makes sure the file is bundled with the image route on a
  // serverless deploy, where an untraced asset is a 500 at request time rather
  // than a build failure.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile images
      },
    ],
  },
};

export default nextConfig;
