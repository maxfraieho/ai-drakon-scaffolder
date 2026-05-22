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
minio: {
endpoint: string;
bucket: string;
accessKey: string;
};
agents: {
drakonUrl: string;
architectUrl: string;
docsUrl: string;
};
cliAgents: {
cli1: { url: string; label: string; apiKey: string };
cli2: { url: string; label: string; apiKey: string };
};
};

