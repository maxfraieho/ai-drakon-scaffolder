import { defineConfig } from "vitest/config";

// Isolated from the root vite.config.ts (TanStack Start / Nitro app config)
// on purpose -- this package is pure evaluation logic, not part of the web
// app, and must not inherit the root's Vite plugin stack. Same reasoning
// as services/deterministic-engine/vitest.config.ts (Phase 2 Slice 1).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
