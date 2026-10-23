import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const deployment = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8"),
) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const previewHeaders = Object.fromEntries(
  deployment.headers[0].headers.map(({ key, value }) => [key, value]),
);

export default defineConfig({
  preview: { headers: previewHeaders },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "icon-192.png",
        "icon-512.png",
        "maskable-512.png",
      ],
      manifest: {
        name: "BelajarMandarin · Taman Bunyi",
        short_name: "BelajarMandarin",
        description: "Ruang kecil untuk mengenali bunyi Mandarin",
        lang: "ms",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F6F3E8",
        theme_color: "#246B55",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackAllowlist: [
          /^\/$/,
          /^\/(belajar|unit-0|ulang-kaji|statistik|tetapan)\/?$/,
        ],
        runtimeCaching: [],
      },
    }),
  ],
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});

import { readFileSync } from "node:fs";
