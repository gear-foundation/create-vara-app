import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: { "@": "/src" },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
