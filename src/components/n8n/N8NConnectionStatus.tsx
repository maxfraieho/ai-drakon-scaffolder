import { CheckCircle2, Loader2 } from "lucide-react";

export type N8NConnectionState = "unconfigured" | "connected" | "error";

type N8NConnectionStatusProps = {
  status: N8NConnectionState;
  n8nUrl?: string;
  checking?: boolean;
};

export function N8NConnectionStatus({ status, n8nUrl, checking = false }: N8NConnectionStatusProps) {
  if (checking) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        <span>Checking connection…</span>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        <span>Connected to {n8nUrl || "N8N"}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
        <span>Connection failed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" aria-hidden="true" />
      <span>Not configured</span>
    </div>
  );
}