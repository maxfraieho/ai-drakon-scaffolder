import { NotebookLMChatPanel } from "@/components/notebooklm/NotebookLMChatPanel";
import { Notebook, Info, BookOpen } from "lucide-react";

export function NotebookLMPage() {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-foreground">
      {/* Page Header */}
      <div className="border-b border-white/5 px-6 py-5 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="h-5 w-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-white">Knowledge Agents</h1>
        </div>
        <p className="text-sm text-gray-400">Archivist AI агенти — чат з базами знань ваших зон</p>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <NotebookLMChatPanel />
      </div>
    </div>
  );
}

