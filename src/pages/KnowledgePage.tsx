import { useState } from "react";
import { PlusCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeZonesList } from "@/components/knowledge/KnowledgeZonesList";
import { ZoneCreationDialog } from "@/components/knowledge/ZoneCreationDialog";

export function KnowledgePage() {
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]" data-testid="knowledge-page">
      {/* Page Header */}
      <div className="border-b border-white/5 px-6 py-5 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="h-5 w-5 text-teal-400" />
            <h1 className="text-lg font-semibold text-white">Знання</h1>
          </div>
          <p className="text-sm text-gray-400">Knowledge zones з Garden Bloom — джерела знань для ваших агентів</p>
        </div>
        <Button
          onClick={() => setIsCreationDialogOpen(true)}
          size="sm"
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-4 py-2 font-semibold text-black active:scale-[0.96] transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Create Zone
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <KnowledgeZonesList />
        </div>
      </div>

      <ZoneCreationDialog
        isOpen={isCreationDialogOpen}
        onClose={() => setIsCreationDialogOpen(false)}
      />
    </div>
  );
}
