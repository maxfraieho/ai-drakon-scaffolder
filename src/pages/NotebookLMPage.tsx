import { NotebookLMChatPanel } from "@/components/notebooklm/NotebookLMChatPanel";
import { Notebook, Info } from "lucide-react";

export function NotebookLMPage() {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-foreground">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Notebook className="w-6 h-6 text-indigo-400" /> NotebookLM
        </h1>
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-muted border border-blue-500/20 text-blue-400 text-xs">
          <Info className="w-4 h-4 shrink-0" />
          <span>Connect to knowledge zones via Garden Gateway to access vector-indexed materials.</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <NotebookLMChatPanel />
      </div>
    </div>
  );
}

