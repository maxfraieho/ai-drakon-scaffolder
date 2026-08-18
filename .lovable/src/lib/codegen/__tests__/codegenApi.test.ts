import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @/lib/appwrite
vi.mock("@/lib/appwrite", () => ({
  account: {
    createJWT: vi.fn(async () => ({ jwt: "fresh-jwt" })),
  },
}));

// Mock @/lib/auth
vi.mock("@/lib/auth", () => ({
  setAccessToken: vi.fn(),
}));

describe("generateDrakonCode", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) => {
        if (key === "jwt") return "mock-jwt";
        if (key === "app_worker_url") return "https://mock-worker.dev";
        return null;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should make a successful synchronous generation request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            drakon_json: { test: "data" },
            language: "js",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );

    const { generateDrakonCode } = await import("../codegenApi");

    const result = await generateDrakonCode({
      description: "Test description",
      language: "js",
      functionName: "testFunc",
      params: "a, b",
    });

    expect(result.success).toBe(true);
    expect(result.drakon_json).toEqual({ test: "data" });
    expect(result.language).toBe("js");
  });

  it("should poll for results when given an execution_id", async () => {
    let fetchCallCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          // Initial POST request returns execution_id
          return new Response(
            JSON.stringify({
              execution_id: "exec-123",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else if (fetchCallCount === 2) {
          // First poll returns pending
          return new Response(
            JSON.stringify({
              status: "pending",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else {
          // Second poll returns completed
          return new Response(
            JSON.stringify({
              status: "completed",
              output: {
                success: true,
                drakon_json: { polled: "yes" },
                language: "js",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      })
    );

    // Fast-forward setTimeouts
    vi.useFakeTimers();

    const { generateDrakonCode } = await import("../codegenApi");

    const promise = generateDrakonCode({
      description: "Test description",
      language: "js",
      functionName: "testFunc",
      params: "a, b",
    });

    // Run pending timers to trigger poll calls
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.drakon_json).toEqual({ polled: "yes" });
    expect(fetchCallCount).toBe(3);

    vi.useRealTimers();
  });

  it("should fail when worker returns an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("Server Error", {
          status: 500,
        })
      )
    );

    const { generateDrakonCode } = await import("../codegenApi");

    await expect(
      generateDrakonCode({
        description: "Test description",
        language: "js",
        functionName: "testFunc",
        params: "a, b",
      })
    ).rejects.toThrow("codegen HTTP 500: Server Error");
  });

  it("should throw when polling reaches completed status but output.success is false", async () => {
    let fetchCallCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return new Response(JSON.stringify({ execution_id: "exec-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          status: "completed",
          output: { success: false, error: "validation failed" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }));
    vi.useFakeTimers();
    const { generateDrakonCode } = await import("../codegenApi");
    const promise = generateDrakonCode({
      description: "Test description",
      language: "js",
      functionName: "testFunc",
      params: "a, b",
    });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow("validation failed");
    vi.useRealTimers();
  });

  it("should throw when polling reaches failed status", async () => {
    let fetchCallCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return new Response(JSON.stringify({ execution_id: "exec-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          status: "failed",
          error: "llm timeout upstream",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }));
    vi.useFakeTimers();
    const { generateDrakonCode } = await import("../codegenApi");
    const promise = generateDrakonCode({
      description: "Test description",
      language: "js",
      functionName: "testFunc",
      params: "a, b",
    });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow("Codegen failed: llm timeout upstream");
    vi.useRealTimers();
  });

  it("should throw when worker response has neither success boolean nor execution_id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ));
    const { generateDrakonCode } = await import("../codegenApi");
    await expect(
      generateDrakonCode({
        description: "Test description",
        language: "js",
        functionName: "testFunc",
        params: "a, b",
      })
    ).rejects.toThrow("Немає execution_id у відповіді worker");
  });

  it("should ignore transient network failures during polling and eventually time out", async () => {
    let fetchCallCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return new Response(JSON.stringify({ execution_id: "exec-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Імітуємо збій мережі під час поллінгу
      throw new Error("Network error");
    }));
    vi.useFakeTimers();
    const { generateDrakonCode } = await import("../codegenApi");
    const promise = generateDrakonCode({
      description: "Test description",
      language: "js",
      functionName: "testFunc",
      params: "a, b",
    });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow("Timeout: генерація коду не завершилася за 3 хвилини");
    vi.useRealTimers();
  });
});
