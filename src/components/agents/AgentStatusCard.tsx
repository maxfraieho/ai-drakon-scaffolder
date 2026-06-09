import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface AgentStatusCardProps {
  name: string;
  status: 'online' | 'offline' | 'checking';
  description: string;
  route: string;
}

const statusConfig = {
  online: { color: 'bg-emerald-500', icon: ShieldCheck, label: 'Online' },
  offline: { color: 'bg-rose-500', icon: AlertCircle, label: 'Offline' },
  checking: { color: 'bg-amber-500', icon: Activity, label: 'Checking' },
};

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ 
  name, 
  status, 
  description, 
  route 
}) => {
  const navigate = useNavigate();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
      {/* Glow Effect Layer */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-500/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5 items-center justify-center`}>
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.color} opacity-75`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${config.color}`}></span>
            </span>
            <h3 className="font-semibold text-zinc-100">{name}</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-[240px] leading-relaxed">
            {description}
          </p>
        </div>

        <button
          onClick={() => navigate(route)}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-zinc-700 hover:text-indigo-300"
        >
          Open
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-6 flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Icon className="h-4 w-4" />
        <span>Status: {config.label}</span>
      </div>
    </div>
  );
};
