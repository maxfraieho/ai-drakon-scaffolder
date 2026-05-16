import { useState } from "react";
import { AgentSidebar } from "@/components/agents/AgentSidebar";
import { PipelineGraph } from "@/components/agents/PipelineGraph";
import { NodeInspector } from "@/components/agents/NodeInspector";
import { NodeCard } from "@/components/agents/NodeCard";
import { KbDrawer } from "@/components/agents/KbDrawer";
import {
  PIPELINES,
  KB_FILES,
  type AgentPipeline,
  type AgentNode,
  type KbFile,
  type AgentId,
} from "@/lib/agent-studio-data";
import { cn } from "@/lib/utils";

const TABS: { id: AgentId; label: string }[] = [
  { id: "architect", label: "Architect" },
  { id: "drakon", label: "DRAKON" },
  { id: "docs", label: "Docs" },
];

export default function AgentStudioPage() {
  const [activeTab, setActiveTab] = useState<AgentId>("architect");
  const [selectedPipeline, setSelectedPipeline] = useState<AgentPipeline>(
    PIPELINES.find((p) => p.agentId === "architect") ?? PIPELINES[0]
  );
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [selectedKbFile, setSelectedKbFile] = useState<KbFile | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const llmNodes = selectedPipeline.nodes.filter((n) => n.hasPrompt);
  const agentKbFiles = KB_FILES.filter((f) => f.agentId === selectedPipeline.agentId);

  const handleSelectPipeline = (p: AgentPipeline) => {
    setSelectedPipeline(p);
    setSelectedNode(null);
  };

  const handleSelectTab = (tab: AgentId) => {
    setActiveTab(tab);
    const next = PIPELINES.find((p) => p.agentId === tab);
    if (next) {
      setSelectedPipeline(next);
      setSelectedNode(null);
      setSelectedKbFile(null);
    }
  };

  return (
    <div className="font-ui-sm flex h-screen w-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] antialiased">
      {/* Top Navigation Bar */}
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-3">
        <div className="flex h-full items-center gap-6">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] md:hidden"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <span className="font-headline-sm text-[var(--color-on-surface)]">
            ⚙ АГЕНТНА ЛОГІКА
          </span>
          <nav className="flex h-full items-center gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "font-ui-sm flex h-full items-center pt-0.5 transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-[var(--color-primary-container)] text-[var(--color-primary-container)]"
                    : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary-container)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-label text-[var(--color-tertiary)]">● LIVE</span>
          <button className="flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary-container)]">
            <span className="material-symbols-outlined text-[18px]">sensors</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <AgentSidebar
          pipelines={PIPELINES}
          kbFiles={KB_FILES}
          selectedPipeline={selectedPipeline}
          selectedNode={selectedNode}
          onSelectPipeline={handleSelectPipeline}
          onSelectNode={setSelectedNode}
          onSelectKbFile={(f) => {
            setSelectedKbFile(f);
            setKbOpen(true);
          }}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h1 className="font-headline-sm text-[var(--color-on-surface)]">
                  {selectedPipeline.name}
                </h1>
                <span className="font-mono-label text-[var(--color-on-surface-variant)]">
                  {selectedPipeline.description}
                </span>
              </div>
              <span className="font-mono-label text-[var(--color-on-surface-variant)]">
                {llmNodes.length} LLM · {selectedPipeline.nodes.length - llmNodes.length} det
              </span>
            </div>

            <PipelineGraph pipeline={selectedPipeline} />

            {llmNodes.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="font-mono-label uppercase text-[var(--color-on-surface-variant)]">
                  Вузли з промптами
                </span>
                <div className="flex flex-col gap-2">
                  {llmNodes.map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      selected={selectedNode?.id === node.id}
                      onClick={() =>
                        setSelectedNode(selectedNode?.id === node.id ? null : node)
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 text-center">
                <p className="font-mono-label text-[var(--color-on-surface-variant)]">
                  Всі вузли детерміністичні — LLM не використовується
                </p>
              </div>
            )}
          </div>

          <KbDrawer
            open={kbOpen}
            kbFiles={agentKbFiles}
            selectedFile={selectedKbFile}
            onToggle={() => setKbOpen((v) => !v)}
            onSelectFile={setSelectedKbFile}
          />
        </main>

        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            pipelineId={selectedPipeline.id}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
