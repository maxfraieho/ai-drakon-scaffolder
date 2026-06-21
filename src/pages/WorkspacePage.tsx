import { useState } from "react";
import { FileCode, FileText, Brain } from "lucide-react";
import { ProjectFileManager } from "@/components/files/ProjectFileManager";
import { GardenPage } from "@/pages/GardenPage";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";
import { getGithubConfig } from "@/lib/settings-storage";
import { KnowledgeGraphPanel } from "@/components/workspace/KnowledgeGraphPanel";

type WorkspaceMode = "code" | "docs" | "kg";

export function WorkspacePage() {
  const [mode, setMode] = useState<WorkspaceMode>("code");
  const { activeProject } = useProject();
  const ghCfg = getGithubConfig();

  const owner = activeProject?.github?.owner || ghCfg.owner || "";
  const repo = activeProject?.github?.repo || ghCfg.repo || "";
  const branch = activeProject?.github?.branch || ghCfg.branch || "main";
  const token = ghCfg.token || "";

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="flex items-center px-2 h-8 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {(
          [
            { m: "code" as WorkspaceMode, label: "Код", Icon: FileCode },
            { m: "docs" as WorkspaceMode, label: "Документація", Icon: FileText },
            { m: "kg" as WorkspaceMode, label: "Knowledge Graph", Icon: Brain },
          ]
        ).map(({ m, label, Icon }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "inline-flex items-center gap-1.5 h-full px-3 border-b-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              mode === m
                ? "border-[var(--accent-amber)] text-[var(--accent-amber)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={cn("h-full", mode !== "code" && "hidden")}>
          <ProjectFileManager defaultMode="code" />
        </div>
        <div className={cn("h-full", mode !== "docs" && "hidden")}>
          <GardenPage />
        </div>
        <div className={cn("h-full", mode !== "kg" && "hidden")}>
          <KnowledgeGraphPanel
            owner={owner}
            repo={repo}
            branch={branch}
            token={token}
          />
        </div>
      </div>
    </div>
  );
}
