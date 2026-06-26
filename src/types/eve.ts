export interface EVEAgentDirectory extends Record<string, string> {
  'agent/instructions.md': string;
  'agent/agent.ts': string;
  'package.json': string;
}

export interface CompileEVEResponse {
  files: Record<string, string>;
  deployCommand: string;
  requiresVercelConnect: boolean;
}
