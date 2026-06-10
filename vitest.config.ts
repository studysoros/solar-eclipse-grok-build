import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// NOTE: vite-tsconfig-paths is ESM-only and currently causes esbuild issues
// with Vitest's config loader in this environment. We use relative imports
// for pure physics tests (acceptable) and will refine for React tests later
// (or switch to a CJS-compatible path mapper).

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
  },
});

