import React, { useState, useEffect, useRef } from 'react';
import { Link } from "@tanstack/react-router";
import { ArrowRight, Activity, ShieldCheck, AlertCircle } from 'lucide-react';
import { getAccessToken } from "@/lib/auth";

interface AgentStatusCardProps {
  name: string;
  healthUrl: string;
  description: string;
  route: string;
}

type Status = 'online' | 'offline' | 'checking';

const statusConfig = {
  online:   { color: 'bg-emerald-500', icon: ShieldCheck, label: 'Online' },
  offline:  { color: 'bg-rose-500',    icon: AlertCircle, label: 'Offline' },
  checking: { color: 'bg-amber-500',   icon: Activity,    label: 'Checking' },
};

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({
  name,
  healthUrl,
  description,
  route,
}) => {
  const [status, setStatus] = useState<Status>('checking');
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    let timer: ReturnType<typeof setTimeout>;

    const checkHealth = async () => {
      try {
        const token = getAccessToken();
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch(healthUrl, {
          headers,
          signal: AbortSignal.timeout(4000),
        });
        if (!activeRef.current) return;
        setStatus(resp.ok ? 'online' : 'offline');
      } catch {
        if (activeRef.current) setStatus('offline');
      }
      if (activeRef.current) {
        timer = setTimeout(checkHealth, 30000);
      }
    };

    checkHealth();
    return () => {
      activeRef.current = false;
      clearTimeout(timer);
    };
  }, [healthUrl]);

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
      {/* Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.color} ${status === 'checking' ? 'animate-pulse' : ''}`} />
            <h3 className="font-bold text-white text-lg">{name}</h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-1">
            <Icon className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-400">{config.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>

        {/* Open button */}
        <Link
          to={route}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Open
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};

export default AgentStatusCard;
