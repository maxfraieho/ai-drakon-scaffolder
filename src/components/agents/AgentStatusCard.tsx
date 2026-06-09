import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Wifi, WifiOff, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/auth";

interface AgentStatusCardProps {
  name: string;
  status?: "online" | "offline" | "checking";
  healthUrl?: string;
  description: string;
  route: string;
}

const STATUS_CONFIG = {
  online: { color: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", text: "Online", ring: "border-emerald-500/20 text-emerald-400" },
  offline: { color: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", text: "Offline", ring: "border-rose-500/20 text-rose-400" },
  checking: { color: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", text: "Checking", ring: "border-amber-500/20 text-amber-400" },
};

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({
  name,
  status,
  healthUrl,
  description,
  route,
}) => {
  const [currentStatus, setCurrentStatus] = useState<"online" | "offline" | "checking">(status || "checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (status) {
      setCurrentStatus(status);
    }
  }, [status]);

  useEffect(() => {
    if (!healthUrl) return;

    let active = true;
    setCurrentStatus("checking");

    const checkHealth = async () => {
      try {
        const token = getAccessToken();
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const resp = await fetch(healthUrl, {
          headers,
          signal: AbortSignal.timeout(4000),
        });
        if (!active) return;
        setCurrentStatus(resp.ok ? "online" : "offline");
      } catch (err) {
        if (!active) return;
        setCurrentStatus("offline");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [healthUrl, retryCount]);

  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.checking;

  return (
    <Card className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-2xl hover:shadow-indigo-500/5">
      {/* Premium hover glow effect */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between space-x-4">
          <h3 className="font-bold text-base text-zinc-100 tracking-tight group-hover:text-white transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2">
            {healthUrl && (
              <button 
                onClick={() => setRetryCount(p => p + 1)}
                className="p-1 rounded-full hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Refresh status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${currentStatus === "checking" ? "animate-spin text-amber-500" : ""}`} />
              </button>
            )}
            <div
              className={`flex items-center space-x-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-950/60 ${config.ring}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${config.color} ${
                  currentStatus === "checking" ? "animate-pulse" : ""
                }`}
              />
              <span>{config.text}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed min-h-[40px]">
          {description}
        </p>

        {healthUrl && (
          <div className="text-xs font-mono text-zinc-500 flex justify-between items-center bg-zinc-950/30 px-2 py-1 rounded border border-zinc-800/50">
            <span className="text-zinc-600">Endpoint:</span>
            <span className="truncate max-w-[180px]" title={healthUrl}>
              {healthUrl.replace(/https?:\/\/[^\/]+/, "")}
            </span>
          </div>
        )}

        <div className="pt-2">
          <Link to={route}>
            <Button
              className="w-full bg-zinc-850 hover:bg-indigo-950/40 border border-zinc-700 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center space-x-1.5 text-xs shadow-md"
            >
              <span>Open Agent Console</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
export default AgentStatusCard;
