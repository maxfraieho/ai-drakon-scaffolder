export type AppSettings = {
  github: {
    owner: string;
    repo: string;
    branch: string;
    token: string;
  };
  project: {
    name: string;
    githubOwner: string;
    githubRepo: string;
    githubBranch: string;
    repoRoot: string;
  };
  n8n: {
    baseUrl: string;
    apiKey: string;
    webhookUrl: string;
    enabled: boolean;
  };
  app: {
    workerUrl: string;
    defaultFolder: string;
    theme: 'light' | 'dark' | 'system';
  };
  minio: {
    endpoint: string;
    bucket: string;
    accessKey: string;
  };
  agents: {
    drakonUrl: string;
    architectUrl: string;
    docsUrl: string;
    proxyModel: string;
    proxyProtocol: 'openai' | 'anthropic';
  };
};
