import type { NextConfig } from "next";

const securityHeaders = [
  // Never let this app be framed by another origin (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stop the browser from MIME-sniffing responses away from their declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full URL (which can carry patient identifiers in query
  // strings) to third-party sites via the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable APIs this app has no reason to use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
