export interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface N8NConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8NWorkflow {
  name: string;
  nodes: N8NNode[];
  connections: Record<string, { main: N8NConnection[][] }>;
  active: boolean;
  settings: { executionOrder: "v1" };
}
