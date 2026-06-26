import type { IrDiagram } from "./htse/ir-types";
import type { N8NWorkflow, N8NNode, N8NConnection } from "../types/n8n";

export function ribosomeN8N(ir: IrDiagram, workflowName: string): N8NWorkflow {
  if (!ir || typeof ir !== "object") {
    throw new Error("Invalid IR diagram");
  }

  if (!ir.items || Object.keys(ir.items).length === 0) {
    return {
      name: workflowName,
      nodes: [],
      connections: {},
      active: false,
      settings: { executionOrder: "v1" },
    };
  }

  const nodes: N8NNode[] = [];
  const connections: Record<string, { main: N8NConnection[][] }> = {};
  const nameMap = new Map<string, string>();
  const usedNames = new Set<string>();

  const getUniqueName = (content: string, type: string, id: string): string => {
    let name = content.replace(/^::\s*n8n\s*::\s*/i, "").trim();
    if (!name) {
      name = type;
    }
    // Clean name
    name = name.replace(/[^a-zA-Z0-9 _-]/g, "");
    if (!name) name = "node";

    let uniqueName = name;
    let counter = 1;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${name} ${counter}`;
      counter++;
    }
    usedNames.add(uniqueName);
    return uniqueName;
  };

  const itemEntries = Object.entries(ir.items);

  // Pass 1: Nodes
  itemEntries.forEach(([itemId, item], index) => {
    let nodeType = "n8n-nodes-base.noOp";
    let typeVersion = 1;

    if (item.meta?.n8nNodeType) {
      nodeType = item.meta.n8nNodeType;
      typeVersion = item.meta.n8nTypeVersion || 1;
    } else if (item.content?.startsWith(":: n8n ::")) {
      const parts = item.content.split("::");
      const service = parts[2] ? parts[2].trim() : "";
      if (service === "Webhook") {
        nodeType = "n8n-nodes-base.webhook";
        typeVersion = 2;
      } else if (service === "HTTP Request") {
        nodeType = "n8n-nodes-base.httpRequest";
        typeVersion = 3;
      } else if (service === "Telegram") {
        nodeType = "n8n-nodes-base.telegram";
        typeVersion = 1;
      } else if (service === "Code") {
        nodeType = "n8n-nodes-base.code";
        typeVersion = 2;
      }
    } else if (item.type === "question") {
      nodeType = "n8n-nodes-base.if";
      typeVersion = 2;
    }

    const nodeName = getUniqueName(item.content || "", item.type, itemId);
    nameMap.set(itemId, nodeName);

    const parameters: Record<string, unknown> = { ...(item.meta?.n8nParams || {}) };

    const node: N8NNode = {
      id: itemId,
      name: nodeName,
      type: nodeType,
      typeVersion,
      position: [index * 220, 300],
      parameters,
    };

    if (item.meta?.credentialName) {
      let credType = "httpHeaderAuth";
      if (nodeType.includes("telegram")) credType = "telegramApi";
      else if (nodeType.includes("httpRequest")) credType = "httpHeaderAuth";

      node.credentials = {
        [credType]: {
          id: "",
          name: item.meta.credentialName,
        },
      };
    }

    nodes.push(node);
  });

  // Pass 2: Connections
  itemEntries.forEach(([itemId, item]) => {
    const sourceName = nameMap.get(itemId);
    if (!sourceName) return;

    const mainConnections: N8NConnection[][] = [];

    // Output 0 (one)
    if (item.one && nameMap.has(item.one)) {
      mainConnections[0] = [
        {
          node: nameMap.get(item.one)!,
          type: "main",
          index: 0,
        },
      ];
    } else {
      mainConnections[0] = [];
    }

    // Output 1 (two) - question
    if (item.type === "question") {
      if (item.two && nameMap.has(item.two)) {
        mainConnections[1] = [
          {
            node: nameMap.get(item.two)!,
            type: "main",
            index: 0,
          },
        ];
      } else {
        mainConnections[1] = [];
      }
    }

    if (mainConnections[0].length > 0 || (mainConnections[1] && mainConnections[1].length > 0)) {
      connections[sourceName] = { main: mainConnections };
    }
  });

  return {
    name: workflowName,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
  };
}
