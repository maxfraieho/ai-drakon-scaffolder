import { useState } from "react";
import { PlusCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeZonesList } from "@/components/knowledge/KnowledgeZonesList";
import { ZoneCreationDialog } from "@/components/knowledge/ZoneCreationDialog";

export function KnowledgePage() {
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);

  return (
    <div className="astryx-migrated flex flex-col h-full bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]" data-testid="knowledge-page">
      {/* Page Header */}
      <div className="border-b border-[var(--astryx-border-subtle)] px-6 py-5 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="h-5 w-5 text-[var(--astryx-color-brand)]" />
            <h1 className="text-lg font-semibold text-[var(--astryx-text-primary)]">Знання</h1>
          </div>
          <p className="text-sm text-[var(--astryx-text-secondary)]">Knowledge zones з Garden Bloom — джерела знань для ваших агентів</p>
        </div>
        <Button
          onClick={() => setIsCreationDialogOpen(true)}
          size="sm"
          className="inline-flex items-center gap-1.5 rounded-[var(--astryx-radius-sm)] bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] px-4 py-2 font-semibold text-[var(--astryx-color-on-brand)] active:scale-[0.96] transition-all"
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
