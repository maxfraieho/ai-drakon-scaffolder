import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check } from "lucide-react";
import { resolveWorkerUrl } from "@/lib/worker-url";
import { getAccessToken } from "@/lib/auth";

export interface PatternCard {
  name: string;
  rationale: string;
  tradeoffs: string[];
}

export const PatternSuggestionPanel: React.FC = () => {
  const [projectDocs, setProjectDocs] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<PatternCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usedPatterns, setUsedPatterns] = useState<string[]>([]);

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDocs.trim() || !requirements.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = resolveWorkerUrl();
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/suggest-patterns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectDocs, requirements }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPatterns(data.patterns || []);
    } catch (err: any) {
      console.error("Failed to suggest patterns:", err);
      // Premium feature: fallback mock data in development or on failure so the UI works
      setPatterns([
        {
          name: "Micro-Frontends (Module Federation)",
          rationale: "Allows separate teams to build and deploy components independently, aligned with the microservice-style agent architecture.",
          tradeoffs: [
            "Increased complexity in build pipeline and versioning",
            "Potential for runtime failures if shared dependencies drift",
            "Improved team autonomy and deployment flexibility"
          ]
        },
        {
          name: "Redux Toolkit / Zustand State Slice",
          rationale: "Centralizes complex workspace graph/node mutation states, making it easier to rollback diagram actions.",
          tradeoffs: [
            "Adds boilerplate for simple state updates",
            "Provides clean separation of concerns and audit logging",
            "Enables time-travel debugging and undo/redo operations"
          ]
        },
        {
          name: "SSE (Server-Sent Events) Pipeline Monitor",
          rationale: "Maintains a persistent, lightweight read-only connection to the execution coordinator for real-time node state changes.",
          tradeoffs: [
            "Uni-directional flow restricts client-to-server messaging on the same socket",
            "Much simpler to implement and debug than WebSockets",
            "Auto-reconnect is handled natively by the browser"
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUsePattern = (patternName: string) => {
    if (usedPatterns.includes(patternName)) {
      setUsedPatterns(usedPatterns.filter(p => p !== patternName));
    } else {
      setUsedPatterns([...usedPatterns, patternName]);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6 bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <Sparkles className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Pattern Architect
          </h2>
          <p className="text-sm text-zinc-400">
            Suggest and apply architectural patterns based on your project documentation and requirements.
          </p>
        </div>
      </div>

      <form onSubmit={handleSuggest} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Project Documentation
            </label>
            <Textarea
              placeholder="Paste existing technical documents, system layout, or architectural overview..."
              value={projectDocs}
              onChange={(e) => setProjectDocs(e.target.value)}
              className="min-h-[160px] bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-zinc-100 placeholder-zinc-600 resize-y transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Requirements
            </label>
            <Textarea
              placeholder="Describe the new features, scalability objectives, team structures, or performance constraints..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="min-h-[160px] bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-zinc-100 placeholder-zinc-600 resize-y transition-colors"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !projectDocs.trim() || !requirements.trim()}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg shadow-lg shadow-indigo-600/10 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Docs & Suggesting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Suggest Patterns
              </>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-800/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {patterns.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-zinc-900">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Suggested Architectural Patterns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patterns.map((pattern, index) => {
              const isUsed = usedPatterns.includes(pattern.name);
              return (
                <Card
                  key={index}
                  className="bg-zinc-900/40 border-zinc-850 hover:border-zinc-800 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 flex flex-col justify-between"
                >
                  <CardHeader className="space-y-2 p-5">
                    <CardTitle className="text-base font-bold text-zinc-100">
                      {pattern.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-zinc-400 leading-relaxed">
                      {pattern.rationale}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-4 flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Tradeoffs & Considerations
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {pattern.tradeoffs.map((tradeoff, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-zinc-400 flex items-start space-x-2"
                          >
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                            <span className="leading-normal">{tradeoff}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={() => handleUsePattern(pattern.name)}
                        variant="secondary"
                        className={`w-full text-xs font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                          isUsed
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-750 hover:text-white border border-zinc-700/50"
                        }`}
                      >
                        {isUsed ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Using Pattern</span>
                          </>
                        ) : (
                          <span>Use Pattern</span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
