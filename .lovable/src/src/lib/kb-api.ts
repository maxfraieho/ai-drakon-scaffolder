import { resolveWorkerUrl } from "@/lib/worker-url";

export interface KbContributePayload {
code: string;
ir_yaml: string;
language?: string;
description?: string;
job_id?: string;
}

export async function kbContribute(
payload: KbContributePayload,
token: string
): Promise<{ id: string; timestamp: number }> {
const res = await fetch(`${resolveWorkerUrl()}/v1/kb/contribute`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`,
},
body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(`KB contribute failed: ${res.status}`);
return res.json();
}
