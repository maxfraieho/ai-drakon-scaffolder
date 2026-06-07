import React from "react";
import { Link } from "@tanstack/react-router";
import { Wifi, WifiOff, Loader2, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AgentStatusCardProps {
  name: string;
  status: "online" | "offline" | "checking";
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
  description,
  route,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.checking;

  return (
    <Card className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-2xl hover:shadow-indigo-500/5">
      {/* Premium hover glow effect */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between space-x-4">
          <h3 className="font-bold text-base text-zinc-100 tracking-tight group-hover:text-white transition-colors">
            {name}
          </h3>
          <div
            className={`flex items-center space-x-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-950/60 ${config.ring}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${config.color} ${
                status === "checking" ? "animate-pulse" : ""
              }`}
            />
            <span>{config.text}</span>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed min-h-[40px]">
          {description}
        </p>

        <div className="pt-2">
          <Link to={route}>
            <Button
              className="w-full bg-zinc-800 hover:bg-indigo-950/40 border border-zinc-700 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center space-x-1.5 text-xs shadow-md"
            >
              <span>Open Configuration</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
export default AgentStatusCard;
