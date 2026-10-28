import { defineConfig } from "vite";
export default defineConfig({
  root: "client",
  build: { outDir: "../dist", emptyOutDir: true },
  server: { allowedHosts: true },
  test: { include: ["tests/**/*.test.ts"] },
} as Parameters<typeof defineConfig>[0]);
