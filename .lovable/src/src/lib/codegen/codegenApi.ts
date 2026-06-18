// Client for the DRAKON code-generation flow.
// Mirrors the async poll pattern used by buildSemanticGraph() in notesApi.ts:
// POST /v1/codegen -> execution_id, then poll /v1/codegen-status until completed.

function workerUrl(): string {
  if (typeof window !== "undefined") {
    const v = localStorage.getItem("app_worker_url");
    if (v) return v.replace(/\/+$/, "");
  }
  return "https://drakon-antigravity-worker.maxfraieho.workers.dev";
}

function jwt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt");
}

export interface CodegenParams {
  description: string;
  language: string;
  functionName: string;
  params: string;
  model?: string;
}

export interface CodegenResponse {
  success: boolean;
  drakon_json: Record<string, unknown>;
  language: string;
  functionName?: string;
  error?: string;
}

export async function generateDrakonCode(input: CodegenParams): Promise<CodegenResponse> {
  const token = jwt();
  if (!token) throw new Error("Не авторизовано (JWT відсутній)");

  const res = await fetch(`${workerUrl()}/v1/codegen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`codegen HTTP ${res.status}: ${txt}`);
  }

  const init = (await res.json()) as Record<string, unknown>;

  // Sync result — return directly.
  if (typeof init.success === "boolean") {
    return init as unknown as CodegenResponse;
  }

  const executionId = init.execution_id as string | undefined;
  if (!executionId) throw new Error("Немає execution_id у відповіді worker");

  // Poll status until completed (up to ~3 min; NIM is fast).
  for (let i = 0; i < 60; i++) {
    await new Promise<void>((r) => setTimeout(r, 3000));
    const statusRes = await fetch(
      `${workerUrl()}/v1/codegen-status?execution_id=${executionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => null);
    if (!statusRes?.ok) continue;

    const s = (await statusRes.json()) as Record<string, unknown>;
    if (s.status === "completed" && s.output) {
      const out = s.output as CodegenResponse;
      if (!out.success) {
        throw new Error(out.error || "Генерація не вдалася");
      }
      return out;
    }
    if (s.status === "failed") {
      throw new Error(`Codegen failed: ${String(s.error || "невідома помилка")}`);
    }
  }
  throw new Error("Timeout: генерація коду не завершилася за 3 хвилини");
}
