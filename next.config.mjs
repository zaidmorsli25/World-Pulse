/** @type {import('next').NextConfig} */
const standalone = process.env.WORLDPULSE_STANDALONE === "1";

// Security headers applied to every response.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = standalone
  ? {
      // Static, server-less demo build (used for the shareable demo).
      // scripts/build-standalone.mjs sets the API routes aside while this builds.
      output: "export",
      assetPrefix: ".",
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_STANDALONE: "1" },
      distDir: "artifact-build/.next",
    }
  : {
      reactStrictMode: true,
      poweredByHeader: false,
      async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
      },
    };

export default nextConfig;
