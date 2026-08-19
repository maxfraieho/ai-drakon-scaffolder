import { NotebookLMChatPanel } from "@/components/notebooklm/NotebookLMChatPanel";
import { Notebook, Info, BookOpen } from "lucide-react";

export function NotebookLMPage() {
  return (
    <div className="astryx-migrated flex flex-col h-full min-h-0 bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]" data-testid="notebooklm-page">
      {/* Page Header */}
      <div className="border-b border-[var(--astryx-border-subtle)] px-6 py-5 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="h-5 w-5 text-[var(--astryx-color-brand)]" />
          <h1 className="text-lg font-semibold text-[var(--astryx-text-primary)]">Knowledge Agents</h1>
        </div>
        <p className="text-sm text-[var(--astryx-text-secondary)]">Archivist AI агенти — чат з базами знань ваших зон</p>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <NotebookLMChatPanel />
      </div>
    </div>
  );
}

