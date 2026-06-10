export type AgentId = "drakon" | "architect" | "docs" | "sonate-solidaire";

export interface AgentMessage {
id: string;
agentId: AgentId;
role: "user" | "assistant";
content: string;
timestamp: string;
metadata?: {
diagrams?: Array<{ name: string; items: Record<string, unknown> }>;
diagramId?: string;
feedback?: string;
correctedIr?: Record<string, unknown>;
};
}

export interface AgentStatus {
agentId: AgentId;
online: boolean;
url: string;
}

export interface CliMessage {
id: string;
role: "user" | "assistant";
content: string;
timestamp: string;
}

