export type AppSettings = {
  github: {
    owner: string;
    repo: string;
    branch: string;
    token: string;
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
    theme: "light" | "dark" | "system";
  };
};
