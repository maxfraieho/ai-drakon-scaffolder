import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import type { DrakonDiagram } from "@/types/drakonwidget";
import {
fetchPipeline, savePipeline, validatePipeline,
type PipelineConfig,
} from "@/lib/pipeline-config-api";
import { pipelineToIR, irToPipeline } from "@/lib/pipeline-to-drakon";

export default function PipelineEditorPage() {
const { pipelineId } = useParams({ from: "/pipeline/$pipelineId/edit" });
const [config, setConfig] = useState<PipelineConfig | null>(null);
const [errors, setErrors] = useState<string[]>([]);

useEffect(() => {
fetchPipeline(pipelineId)
.then(setConfig)
.catch(() => toast.error("Pipeline не знайдено"));
}, [pipelineId]);

const handleSaveOverride = async (diagram: DrakonDiagram): Promise<boolean> => {
if (!config) return false;
setErrors([]);
try {
const updated = irToPipeline(diagram, config);
const result = await savePipeline(updated);
setConfig((c) => (c ? { ...c, version: result.version } : c));
toast.success("Пайплайн збережено ✓");
return true;
} catch (e) {
const msg = e instanceof Error ? e.message : "Помилка збереження";
setErrors([msg]);
toast.error(msg);
return false;
}
};

const handleValidate = async () => {
try {
const res = await validatePipeline(pipelineId);
setErrors(res.errors);
if (res.valid) toast.success("Топологія валідна ✓");
else toast.error("Топологія невалідна");
} catch (e) {
toast.error("Помилка валідації");
}
};

if (!config) {
return (
<div className="flex h-screen items-center justify-center bg-[var(--bg-base)] font-mono text-sm text-[var(--text-secondary)]">
Завантаження пайплайну…
</div>
);
}
return (
<div className="flex h-screen flex-col bg-[var(--bg-base)] antialiased">
<div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
<Link
to="/agents"
className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
>
<ArrowLeft className="h-3.5 w-3.5" />
Агенти
</Link>
<span className="mx-1 text-[var(--border-subtle)]">·</span>
<span className="font-mono text-xs text-[var(--text-secondary)]">{config.name}</span>
<span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--text-tertiary)]">
v{config.version}
</span>
<button
type="button"
onClick={handleValidate}
className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
>
<ShieldCheck className="h-3.5 w-3.5" />
Validate
</button>
</div>

{errors.length > 0 && (
<div className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--border-subtle)] bg-red-950/30 px-3 py-1.5">
{errors.map((e, i) => (
<span key={i} className="font-mono text-[11px] text-red-400">{e}</span>
))}
</div>
)}

<div className="min-h-0 flex-1">
<DrakonEditor
diagram={pipelineToIR(config)}
diagramId={`pipeline-${config.id`}}
isNew={false}
onSaveOverride={handleSaveOverride}
className="h-full"
/>
</div>
</div>
);
}
---
### pages/LoginPage.tsx
**Розмір:** 3,364 байт


import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from
"@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readSettings } from "@/lib/settings-storage";
import { setAccessToken } from "@/lib/auth";

export function LoginPage() {
const navigate = useNavigate();
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
const [errorMsg, setErrorMsg] = useState<string | null>(null);

const handleLogin = async (e: React.FormEvent) => {
e.preventDefault();
setIsSubmitting(true);
setErrorMsg(null);

try {
const workerUrl = readSettings().app.workerUrl.replace(/\/+$/, "");
const resp = await fetch( `${workerUrl}/auth/login`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ username, password }),
});
const data = await resp.json().catch(() => ({}) as Record<string, unknown>);
const token = (data as { token?: string; jwt?: string }).token ?? (data as { jwt?: string }).jwt;
if (!token) {
throw new Error(((data as { error?: string }).error) || "Невірний логін або пароль");
}
setAccessToken(token);
navigate({ to: "/diagrams", replace: true });
} catch (err) {
setErrorMsg(err instanceof Error ? err.message : "Невірний логін або пароль");
setPassword("");
} finally {
setIsSubmitting(false);
}
};

return (
<div className="flex min-h-screen items-center justify-center bg-background px-4">
<Card className="w-full max-w-sm border-border bg-card">
<CardHeader>
<CardTitle>AI-DRAKON</CardTitle>
<CardDescription>Введіть логін та пароль для входу.</CardDescription>
</CardHeader>
<CardContent>
<form className="space-y-4" onSubmit={handleLogin}>
<div className="space-y-2">
<Label htmlFor="username">Логін</Label>
<Input
id="username"
type="text"
autoComplete="username"
value={username}
onChange={(e) => setUsername(e.target.value)}
required
/>
</div>

<div className="space-y-2">
<Label htmlFor="password">Пароль</Label>
<Input
id="password"
type="password"
autoComplete="current-password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
/>
</div>

{errorMsg ? (
<p role="alert" className="text-sm text-[var(--color-error)]">
{errorMsg}
</p>
) : null}

<Button className="w-full" type="submit" disabled={isSubmitting}>
{isSubmitting ? "Вхід..." : "Увійти"}
</Button>
</form>
</CardContent>
</Card>
</div>
);
}

