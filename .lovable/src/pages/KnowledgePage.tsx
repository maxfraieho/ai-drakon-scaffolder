import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeZonesList } from "@/components/knowledge/KnowledgeZonesList";
import { ZoneCreationDialog } from "@/components/knowledge/ZoneCreationDialog";
import { PageHeader } from "@/components/workspace/PageHeader";

export function KnowledgePage() {
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Knowledge Zones"
        actions={
          <Button
            onClick={() => setIsCreationDialogOpen(true)}
            size="sm"
            className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--accent-amber)] px-3 font-mono text-[11px] uppercase tracking-wider text-black active:scale-[0.96]"
          >
            <PlusCircle className="h-4 w-4" />
            Create Zone
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        <KnowledgeZonesList />
      </div>

      <ZoneCreationDialog
        isOpen={isCreationDialogOpen}
        onClose={() => setIsCreationDialogOpen(false)}
      />
    </div>
  );
}
