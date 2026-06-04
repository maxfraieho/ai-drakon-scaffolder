import { PageHeader } from "@/components/workspace/PageHeader";
import { NotebookLMChatPanel } from "@/components/notebooklm/NotebookLMChatPanel";
import { Info } from "lucide-react";

export function NotebookLMPage() {
  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[var(--bg-base)]">
      <PageHeader title="NotebookLM" />

      {/* Info Banner */}
      <div className="px-4 pt-3 shrink-0">
        <div className="flex items-center gap-2.5 p-3 rounded bg-[var(--accent-dim)] border border-[var(--accent-amber)]/20 text-[var(--accent-amber)] font-mono text-[11px] leading-relaxed">
          <Info className="h-4 w-4 shrink-0" />
          <span>Connect to knowledge zones via Garden Gateway to access vector-indexed materials.</span>
        </div>
      </div>

      {/* Chat Workspace */}
      <div className="flex-1 min-h-0 p-4">
        <NotebookLMChatPanel />
      </div>
    </div>
  );
}
