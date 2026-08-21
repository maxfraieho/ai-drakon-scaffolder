import { defineConfig } from "vitest/config";

// Isolated from the root vite.config.ts (TanStack Start / Nitro app config)
// on purpose -- this package is a plain Node script, not part of the web
// app, and must not inherit the root's Vite plugin stack.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
