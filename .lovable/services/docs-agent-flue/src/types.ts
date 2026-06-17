export interface ToolContext {
  env?: {
    WORKER_URL?: string;
    AUTH_TOKEN?: string;
    [key: string]: any;
  };
  [key: string]: any;
}
