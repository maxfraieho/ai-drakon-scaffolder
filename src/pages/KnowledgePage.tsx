import { useState } from "react";
import { PlusCircle, Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeZonesList } from "@/components/knowledge/KnowledgeZonesList";
import { ZoneCreationDialog } from "@/components/knowledge/ZoneCreationDialog";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotesTab } from "@/components/docs/NotesTab";

export function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<"zones" | "vault">("zones");
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <PageHeader
        title="Knowledge Base"
        actions={
          activeTab === "zones" && (
            <Button
              onClick={() => setIsCreationDialogOpen(true)}
              size="sm"
              className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--accent-amber)] px-3 font-mono text-[11px] uppercase tracking-wider text-black active:scale-[0.96]"
            >
              <PlusCircle className="h-4 w-4" />
              Create Zone
            </Button>
          )
        }
      />

      {/* Main Content Area with sidebar layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card/50 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("zones")}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "zones"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Zones</span>
          </button>
          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "vault"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Vault</span>
          </button>
        </aside>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Top Tabs */}
          <div className="flex md:hidden p-3 border-b border-border bg-card/30">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "zones" | "vault")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="zones" className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Zones
                </TabsTrigger>
                <TabsTrigger value="vault" className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Vault
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === "zones" ? (
              <div className="p-4 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4 md:hidden">
                  <h2 className="text-lg font-semibold tracking-tight">Active Knowledge Zones</h2>
                </div>
                <KnowledgeZonesList />
              </div>
            ) : (
              <div className="h-full overflow-hidden flex flex-col">
                <NotesTab />
              </div>
            )}
          </div>
        </div>
      </div>

      <ZoneCreationDialog
        isOpen={isCreationDialogOpen}
        onClose={() => setIsCreationDialogOpen(false)}
      />
    </div>
  );
}
