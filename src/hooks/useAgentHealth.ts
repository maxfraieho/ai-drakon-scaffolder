import { useEffect, useState } from "react";
import type { AgentId } from "@/types/agent-chat";
import { checkAgentHealth } from "@/lib/agent-api";

const AGENTS: AgentId[] = ["drakon", "architect", "docs"];

export function useAgentHealth() {
  const [status, setStatus] = useState<Record<AgentId, boolean>>({
    drakon: false,
    architect: false,
    docs: false,
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const results = await Promise.allSettled(AGENTS.map(checkAgentHealth));
      if (cancelled) return;
      setStatus({
        drakon: results[0].status === "fulfilled" && results[0].value === true,
        architect: results[1].status === "fulfilled" && results[1].value === true,
        docs: results[2].status === "fulfilled" && results[2].value === true,
      });
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
