import { defineConfig } from "vitest/config";

// Isolated from the root vite.config.ts (TanStack Start / Nitro app config)
// on purpose -- same reasoning as packages/policy-engine/vitest.config.ts:
// this package is pure logic (D1 query construction, Appwrite REST calls),
// not part of the web app, and must not inherit the root's Vite plugin stack.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
