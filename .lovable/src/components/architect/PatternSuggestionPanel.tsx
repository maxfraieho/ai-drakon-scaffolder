import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Pattern {
  name: string;
  rationale: string;
  tradeoffs: string[];
}

interface PatternSuggestionPanelProps {
  architectUrl?: string;
}

export const PatternSuggestionPanel: React.FC<PatternSuggestionPanelProps> = ({
  architectUrl = 'https://architect-agent-flue.maxfraieho.workers.dev',
}) => {
  const [projectDocs, setProjectDocs] = useState('');
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(`${architectUrl}/suggest-patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDocs, requirements }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setPatterns(data.patterns ?? []);
    } catch (err) {
      console.error('suggest-patterns failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <textarea
          className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded p-3 text-sm focus:ring-1 focus:ring-zinc-600 outline-none"
          placeholder="Paste project documentation..."
          value={projectDocs}
          onChange={(e) => setProjectDocs(e.target.value)}
        />
        <textarea
          className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded p-3 text-sm focus:ring-1 focus:ring-zinc-600 outline-none"
          placeholder="Describe requirements..."
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-zinc-100 text-zinc-950 py-2 rounded font-semibold hover:bg-white flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Suggest Patterns'}
        </button>
      </form>

      <div className="space-y-4">
        {patterns.map((p, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-3">
            <h3 className="font-bold text-lg text-white">{p.name}</h3>
            <p className="text-zinc-400 text-sm">{p.rationale}</p>
            <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
              {p.tradeoffs.map((t, j) => (
                <li key={j}>{t}</li>
              ))}
            </ul>
            <button className="text-sm text-zinc-100 border border-zinc-700 px-4 py-1.5 rounded hover:bg-zinc-800">
              Use Pattern
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatternSuggestionPanel;
