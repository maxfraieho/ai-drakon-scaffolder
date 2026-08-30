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

// Status dot colors route through Astryx semantic tokens.
// `checking` uses the brand amber (single-accent rule) since Astryx has no
// dedicated "in-progress" semantic slot — brand amber IS the pending state.
const statusConfig = {
  online:   { color: 'bg-[var(--astryx-semantic-ok-fg)]',       icon: ShieldCheck, label: 'Online' },
  offline:  { color: 'bg-[var(--astryx-semantic-critical-fg)]', icon: AlertCircle, label: 'Offline' },
  checking: { color: 'bg-[var(--astryx-color-brand)]',          icon: Activity,    label: 'Checking' },
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
    <div className="group relative overflow-hidden rounded-[var(--astryx-radius-md)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] p-6 shadow-[var(--astryx-shadow-card)] transition-colors duration-150 hover:border-[var(--astryx-color-brand)]">
      {/* Astryx: flat surfaces only. Indigo gradient hover glow removed. */}

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${config.color} ${status === 'checking' ? 'animate-pulse' : ''}`}
            />
            <h3 className="font-bold text-lg text-[var(--astryx-text-primary)]">{name}</h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)] px-2.5 py-1">
            <Icon className="h-3.5 w-3.5 text-[var(--astryx-text-secondary)]" />
            <span className="text-xs text-[var(--astryx-text-secondary)]">{config.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-[var(--astryx-text-secondary)]">{description}</p>

        {/* Open button */}
        <Link
          to={route}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--astryx-color-brand-hover)] hover:text-[var(--astryx-color-brand)] transition-colors"
        >
          Open
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};

export default AgentStatusCard;
