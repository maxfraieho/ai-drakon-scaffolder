import { useState } from "react";

interface KnowledgeGraphPanelProps {
  graphJsonUrl?: string;
}

export function KnowledgeGraphPanel({ graphJsonUrl }: KnowledgeGraphPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!graphJsonUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-lg font-semibold mb-2">Knowledge Graph</h3>
          <p className="text-sm text-gray-500">
            Run <code>/understand</code> on your project to generate
            an interactive knowledge graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0a0a0a]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10 text-red-400">
          Failed to load dashboard. Check console for details.
        </div>
      )}
      <iframe
        src={graphJsonUrl}
        className="w-full h-full border-0"
        title="Knowledge Graph Dashboard"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
