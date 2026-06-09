/**
 * PipelineProgress.tsx
 * 
 * A robust pipeline monitoring component.
 * Features:
 * - SSE integration via EventSource
 * - Collapsible step-level logging
 * - Real-time state updates
 * - Tailwind Dark Zinc styling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  Terminal 
} from 'lucide-react';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface Step {
  id: string;
  name: string;
  status: StepStatus;
  output?: string[];
}

interface PipelineProps {
  pipelineName: string;
  onComplete?: () => void;
}

export const PipelineProgress: React.FC<PipelineProps> = ({ pipelineName, onComplete }) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const es = new EventSource(`/api/pipelines/${pipelineName}/stream`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setSteps(prev => {
        const next = [...prev];
        const idx = next.findIndex(s => s.id === data.id);
        if (idx > -1) {
          next[idx] = { ...next[idx], ...data };
        } else {
          next.push(data);
        }
        return next;
      });
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [pipelineName]);

  const toggleExpand = (id: string) => 
    setExpanded(p => ({ ...p, [id]: !p[id] }));

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-zinc-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'done': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const progress = steps.length > 0 
    ? (steps.filter(s => s.status === 'done').length / steps.length) * 100 
    : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-2xl text-zinc-100 font-sans shadow-xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">{pipelineName}</h2>
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="border border-zinc-800 rounded bg-zinc-950">
            <button 
              onClick={() => toggleExpand(step.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(step.status)}
                <span className="text-sm font-medium">{step.name}</span>
              </div>
              {step.output && (
                expanded[step.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {expanded[step.id] && step.output && (
              <div className="p-3 pt-0 border-t border-zinc-800 bg-black font-mono text-xs text-zinc-400 space-y-1">
                {step.output.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
