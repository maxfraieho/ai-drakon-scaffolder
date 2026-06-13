import { readSettings } from "@/lib/settings-storage";

const DEFAULT_WORKER_URL = "https://drakon-mcp.aidrakon.tech";

export function resolveWorkerUrl(): string {
if (typeof window !== "undefined") {
const override = readSettings().app.workerUrl.trim();
if (override) return override;
}

return import.meta.env.VITE_WORKER_URL || DEFAULT_WORKER_URL;
}

