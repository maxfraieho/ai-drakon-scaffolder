import { describe, it, expect } from "vitest";
import { ribosomeN8N } from "../ribosome-n8n";
import type { IrDiagram } from "../htse/ir-types";

describe("ribosomeN8N compiler", () => {
  it("simple workflow (header → webhook → action → end) → valid N8N JSON", () => {
    const ir: IrDiagram = {
      name: "Simple Flow",
      access: "public",
      params: [],
      items: {
        h1: { type: "header", content: "Start", one: "w1" },
        w1: { type: "action", content: ":: n8n :: Webhook", one: "a1" },
        a1: { type: "action", content: ":: n8n :: HTTP Request", one: "e1" },
        e1: { type: "end", content: "" },
      },
    };

    const workflow = ribosomeN8N(ir, "My N8N Workflow");

    expect(workflow.name).toBe("My N8N Workflow");
    expect(workflow.nodes).toHaveLength(4);

    // Verify node types and names
    const webhookNode = workflow.nodes.find((n) => n.id === "w1");
    expect(webhookNode).toBeDefined();
    expect(webhookNode?.type).toBe("n8n-nodes-base.webhook");
    expect(webhookNode?.typeVersion).toBe(2);
    expect(webhookNode?.name).toBe("Webhook");

    const httpNode = workflow.nodes.find((n) => n.id === "a1");
    expect(httpNode).toBeDefined();
    expect(httpNode?.type).toBe("n8n-nodes-base.httpRequest");
    expect(httpNode?.typeVersion).toBe(3);
    expect(httpNode?.name).toBe("HTTP Request");

    // Verify connections
    const connStart = workflow.connections["Start"];
    expect(connStart).toBeDefined();
    expect(connStart.main[0][0].node).toBe("Webhook");

    const connWebhook = workflow.connections["Webhook"];
    expect(connWebhook).toBeDefined();
    expect(connWebhook.main[0][0].node).toBe("HTTP Request");

    const connHttp = workflow.connections["HTTP Request"];
    expect(connHttp).toBeDefined();
    expect(connHttp.main[0][0].node).toBe("end");
  });

  it("question node → generates IF node with two outputs", () => {
    const ir: IrDiagram = {
      name: "Conditional Flow",
      access: "public",
      params: [],
      items: {
        h1: { type: "header", content: "Start", one: "q1" },
        q1: { type: "question", content: "Is valid?", one: "a1", two: "a2" },
        a1: { type: "action", content: "Success", one: "e1" },
        a2: { type: "action", content: "Fail", one: "e1" },
        e1: { type: "end", content: "" },
      },
    };

    const workflow = ribosomeN8N(ir, "Conditional Workflow");

    const ifNode = workflow.nodes.find((n) => n.id === "q1");
    expect(ifNode).toBeDefined();
    expect(ifNode?.type).toBe("n8n-nodes-base.if");
    expect(ifNode?.typeVersion).toBe(2);
    expect(ifNode?.name).toBe("Is valid");

    // Connections from IF node
    const connIf = workflow.connections["Is valid"];
    expect(connIf).toBeDefined();
    expect(connIf.main[0][0].node).toBe("Success"); // true branch
    expect(connIf.main[1][0].node).toBe("Fail");    // false branch
  });

  it("meta credentials & params → credentials section present", () => {
    const ir: IrDiagram = {
      name: "Cred Flow",
      access: "public",
      params: [],
      items: {
        h1: { type: "header", content: "Start", one: "a1" },
        a1: {
          type: "action",
          content: ":: n8n :: Telegram",
          one: "e1",
          meta: {
            credentialName: "my-telegram-cred",
            n8nParams: { chat_id: "123456" },
          },
        },
        e1: { type: "end", content: "" },
      },
    };

    const workflow = ribosomeN8N(ir, "Cred Workflow");
    const telegramNode = workflow.nodes.find((n) => n.id === "a1");
    expect(telegramNode).toBeDefined();
    expect(telegramNode?.credentials).toEqual({
      telegramApi: {
        id: "",
        name: "my-telegram-cred",
      },
    });
    expect(telegramNode?.parameters).toEqual({ chat_id: "123456" });
  });

  it("empty/invalid IR → throws or returns empty", () => {
    // Empty items
    const emptyIr: IrDiagram = {
      name: "Empty",
      access: "public",
      params: [],
      items: {},
    };
    const emptyWf = ribosomeN8N(emptyIr, "Empty Workflow");
    expect(emptyWf.nodes).toHaveLength(0);

    // Invalid IR
    expect(() => ribosomeN8N(null as any, "Bad")).toThrow();
  });
});
