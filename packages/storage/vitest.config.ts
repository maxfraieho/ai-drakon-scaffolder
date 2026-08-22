import { defineConfig } from "vitest/config";

// Isolated from the root vite.config.ts (TanStack Start / Nitro app config)
// on purpose -- this package is pure storage-adapter logic, not part of the
// web app, and must not inherit the root's Vite plugin stack. Same reasoning
// as packages/policy-engine/vitest.config.ts and
// services/deterministic-engine/vitest.config.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
