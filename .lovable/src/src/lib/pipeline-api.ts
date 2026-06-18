import { getAccessToken } from "@/lib/auth";
import { resolveWorkerUrl } from "@/lib/worker-url";

const workerUrl = () =>
resolveWorkerUrl();

function authHeaders(): Record<string, string> {
const jwt = getAccessToken();
return {
"Content-Type": "application/json",
...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
};
}
export class ServiceRestartError extends Error {
constructor() {
super("Сервіс перезапустився. Спробуйте ще раз.");
this.name = "ServiceRestartError";
}
}

export interface PipelineJob {
job_id: string;
}

export interface AnalyzedFunction {
name: string;
params: string;
items: Record<string, unknown>;
error?: string;
cyclomatic_complexity?: number;
validation_errors?: string[];
}

export interface AnalyzeResult {
drakon_ir: AnalyzedFunction[];
tree_level: string;
cyclomatic_complexity: number;
validation_errors: string[];
}

export interface GenerateResult {
code: string;
language: string;
syntax_errors: string[];
iterations: number;
}

export interface JobStatus<T = unknown> {
job_id: string;
status: "pending" | "running" | "done" | "error";
result: T;
error: string;
}

export async function startAnalysis(source_code: string, file_path = "module.py"):
Promise<PipelineJob> {
const res = await fetch( `${workerUrl()}/v1/pipeline/analyze`, {
method: "POST",
headers: authHeaders(),
body: JSON.stringify({ source_code, file_path }),
});
if (!res.ok) throw new Error(`analyze HTTP ${res.status}`);
return res.json();
}

export async function startGeneration(
drakon_ir: object,
language: string,
description = "",
): Promise<PipelineJob> {
const res = await fetch( `${workerUrl()}/v1/pipeline/generate`, {
method: "POST",
headers: authHeaders(),
body: JSON.stringify({ drakon_ir, description, language }),
});
if (!res.ok) throw new Error(`generate HTTP ${res.status}`);
return res.json();
}

export async function pollJob<T = unknown>(job_id: string): Promise<JobStatus<T>> {
const res = await fetch( `${workerUrl()}/v1/pipeline/status/${job_id}`, {
headers: authHeaders(),
});
if (res.status === 404) throw new ServiceRestartError();
if (!res.ok) throw new Error(`status HTTP ${res.status}`);
return res.json();
}

export function streamJob<T = unknown>(
job_id: string,
onEvent: (data: JobStatus<T>) => void,
): () => void {
const jwt = getAccessToken() ?? "";
const url = `${workerUrl()}/v1/pipeline/stream/${encodeURIComponent(job_id)}?token=$`
{encodeURIComponent(jwt)};
const es = new EventSource(url);

es.onmessage = (event) => {
try {
const data = JSON.parse(event.data) as JobStatus<T>;
onEvent(data);
if (data.status === "done" || data.status === "error") {
es.close();
}
} catch {
es.close();
}
};

es.onerror = () => {
onEvent({
job_id,
status: "error",
result: null as unknown as T,
error: "SSE connection error",
});
es.close();
};

return () => es.close();
}

