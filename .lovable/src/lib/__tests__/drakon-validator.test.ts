import { describe, it, expect } from "vitest";
import { validateDrakonIR, validateDrakonIRDetailed } from "../drakon-validator";

describe("validateDrakonIR", () => {
  it("valid simple schema → true", () => {
    const ir = { name: "test", access: "public", params: [], items: {
      h1: { type: "header", content: "Start", one: "a1" },
      a1: { type: "action", content: "Do something", one: "e1" },
      e1: { type: "end", content: "" },
    }};
    expect(validateDrakonIR(ir)).toBe(true);
  });

  it("missing items field → false", () => {
    expect(validateDrakonIR({ name: "bad" })).toBe(false);
  });

  it("broken one pointer → false", () => {
    const ir = { name: "t", items: {
      h1: { type: "header", content: "X", one: "nonexistent" },
      e1: { type: "end", content: "" },
    }};
    expect(validateDrakonIR(ir)).toBe(false);
  });

  it("no end node → false", () => {
    const ir = { name: "t", items: {
      h1: { type: "header", content: "X", one: "a1" },
      a1: { type: "action", content: "Y" },
    }};
    expect(validateDrakonIR(ir)).toBe(false);
  });

  it("valid schema with meta fields → true", () => {
    const ir = { name: "test", access: "public", params: [], items: {
      h1: { type: "header", content: "Start", one: "n1" },
      n1: { type: "action", content: ":: n8n :: Webhook", one: "e1",
        meta: { nodeKind: "n8n", n8nNodeType: "webhook", n8nTypeVersion: 2 }},
      e1: { type: "end", content: "" },
    }};
    expect(validateDrakonIR(ir)).toBe(true);
  });
});
