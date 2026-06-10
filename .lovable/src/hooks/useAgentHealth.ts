import { useEffect, useState } from "react";
import type { AgentId } from "@/types/agent-chat";
import { checkAgentHealth } from "@/lib/agent-api";

type ExtendedAgentId = AgentId | "sonate-solidaire";

const AGENTS: ExtendedAgentId[] = ["drakon", "architect", "docs", "sonate-solidaire"];

export function useAgentHealth() {
const [status, setStatus] = useState<Record<ExtendedAgentId, boolean>>({
drakon: false,
architect: false,
docs: false,
"sonate-solidaire": false,
});

useEffect(() => {
let cancelled = false;
const check = async () => {
const results = await Promise.allSettled(AGENTS.map(id => checkAgentHealth(id as AgentId)));
if (cancelled) return;
setStatus({
drakon: results[0].status === "fulfilled" && results[0].value === true,
architect: results[1].status === "fulfilled" && results[1].value === true,
docs: results[2].status === "fulfilled" && results[2].value === true,
"sonate-solidaire": results[3].status === "fulfilled" && results[3].value === true,
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

