import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IrDiagram } from "../ir-types";

const validIrFixture: IrDiagram = {
  name: "Valid",
  access: "private",
  params: [],
  items: {
    n1: { type: "action", content: "A", one: "n2" },
    n2: { type: "end", content: "End" },
  },
};

describe("validateIrRemote", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "mock-jwt"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("INTEGRATION TEST 1 — successful validation response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            valid: true,
            issues: [],
            autofixes: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const { validateIrRemote } = await import("../ir-validator-client");

    const result = await validateIrRemote(validIrFixture);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("INTEGRATION TEST 2 — error response handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Bad request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { validateIrRemote } = await import("../ir-validator-client");

    await expect(validateIrRemote(validIrFixture)).rejects.toThrow("Bad request");
  });
});
