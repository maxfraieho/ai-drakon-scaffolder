import React from 'react';
import { Shield, FileText, CheckCircle, Coins, AlertTriangle } from 'lucide-react';
import { GateVerdict } from '@/lib/harness/pipeline-client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GateIndicatorsProps {
  verdicts: GateVerdict[];
  onClick?: (gate: string) => void;
}

const GATE_ICONS: Record<string, React.ElementType> = {
  safety: Shield,
  policy: FileText,
  confidence: CheckCircle,
  cost: Coins,
};

const GATE_LABELS: Record<string, string> = {
  safety: 'Safety Gate',
  policy: 'Policy Gate',
  confidence: 'Confidence Gate',
  cost: 'Cost Gate',
};

export function GateIndicators({ verdicts, onClick }: GateIndicatorsProps) {
  if (!verdicts || verdicts.length === 0) return null;

  // Ensure we show all 4 gates
  const gates = ['safety', 'policy', 'confidence', 'cost'];

  return (
    <div className="flex items-center space-x-1 mt-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
      <TooltipProvider>
        {gates.map((gate) => {
          const verdict = verdicts.find((v) => v.gate === gate);
          const Icon = GATE_ICONS[gate] || AlertTriangle;
          
          let colorClass = 'text-slate-400';
          let tooltipText = `${GATE_LABELS[gate]}: В очікуванні`;
          
          if (verdict) {
            if (verdict.allowed) {
              colorClass = 'text-green-500';
              tooltipText = `${GATE_LABELS[gate]}: Дозволено`;
            } else {
              colorClass = 'text-red-500';
              tooltipText = `${GATE_LABELS[gate]}: Заблоковано (${verdict.reason || 'Без причини'})`;
            }
          }

          return (
            <Tooltip key={gate}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick && onClick(gate);
                  }}
                  className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${colorClass}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
