import { useEffect, useState } from "react";
import { getAgentsConfig } from "@/lib/settings-storage";
import { cn } from "@/lib/utils";

interface AgentState {
  label: string;
  url: string;
  status: "checking" | "ok" | "error" | "off";
  jobId?: string;
}

async function pingAgent(url: string): Promise<"ok" | "error"> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${url}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export function AgentStatusBar() {
  const cfg = getAgentsConfig();
  const [agents, setAgents] = useState<AgentState[]>([
    { label: "drakon", url: cfg.drakonUrl, status: "checking" },
    { label: "architect", url: cfg.architectUrl, status: "checking" },
    { label: "docs", url: cfg.docsUrl, status: "checking" },
  ]);

  useEffect(() => {
    const check = async () => {
      const results = await Promise.all(
        agents.map(async (a) => ({
          ...a,
          status: (await pingAgent(a.url)) as AgentState["status"],
        }))
      );
      setAgents(results);
    };
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-3 px-2 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      {agents.map((a) => (
        <div key={a.label} className="flex items-center gap-1">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              a.status === "ok" && "bg-green-500",
              a.status === "error" && "bg-red-500 animate-pulse",
              a.status === "checking" && "bg-yellow-400 animate-pulse",
              a.status === "off" && "bg-[var(--text-muted)]",
            )}
          />
          <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
            {a.label}
          </span>
        </div>
      ))}
    </div>
  );
}
