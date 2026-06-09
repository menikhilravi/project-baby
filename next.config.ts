import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Wraps route navigations in document.startViewTransition so the browser
    // crossfades between pages. Customised + nav anchored in globals.css.
    viewTransition: true,
  },
  async headers() {
    return [
      {
        // Service worker must not be cached so users always get the latest
        // version on next page load; also lock down Content-Type.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
