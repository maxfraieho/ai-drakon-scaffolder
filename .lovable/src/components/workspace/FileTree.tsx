import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, FolderPlus, FilePlus, Trash2, Tag, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FSNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FSNode[];
  isLoaded?: boolean;
  isLoading?: boolean;
  sha?: string;
}

export interface FileTreeItemProps {
  node: FSNode;
  level: number;
  selectedPath: string;
  onSelectFile: (path: string) => void;
  onToggleFolder: (node: FSNode) => void;
  onAddFile: (parentPath: string) => void;
  onAddFolder: (parentPath: string) => void;
  onTagFolder: (parentPath: string) => void;
  onDeleteNode: (node: FSNode) => void;
  onAnalyze: (node: FSNode) => void;
  expandedPaths: Set<string>;
  searchQuery: string;
}

function iconForFile(name: string) {
  if (name.endsWith(".drakon")) return "📐";
  if (name.endsWith(".tsx")) return "⚛️";
  if (name.endsWith(".ts")) return "🔷";
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "🟨";
  if (name.endsWith(".json")) return "🧩";
  return "📄";
}

export function FileTreeItem({
  node,
  level,
  selectedPath,
  onSelectFile,
  onToggleFolder,
  onAddFile,
  onAddFolder,
  onTagFolder,
  onDeleteNode,
  onAnalyze,
  expandedPaths,
  searchQuery,
}: FileTreeItemProps) {
  const isExpanded = expandedPaths.has(node.path) || !!searchQuery.trim();
  const isSelected = selectedPath === node.path;

  if (node.type === "dir") {
    return (
      <div className="w-full">
        <div className="group flex items-center hover:bg-white/5/40 rounded transition-colors pr-2">
          <button
            type="button"
            onClick={() => onToggleFolder(node)}
            className="flex-1 flex items-center gap-1.5 py-1 text-left text-xs text-[var(--text-primary)] min-w-0"
            style={{ paddingLeft: `${8 + level * 12}px` }}
          >
            {node.isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)] shrink-0" />
            ) : isExpanded ? (
              <ChevronDown className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-[var(--accent-amber)] shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-[var(--accent-amber)] shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--astryx-text-primary)] hover:bg-white/5 rounded transition-colors p-1"
              title="Analyze"
              onClick={(e) => { e.stopPropagation(); void onAnalyze(node); }}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </Button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddFile(node.path); }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--astryx-text-primary)] hover:bg-white/5 rounded transition-colors"
              title="Новий файл"
            >
              <FilePlus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddFolder(node.path); }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--astryx-text-primary)] hover:bg-white/5 rounded transition-colors"
              title="Нова папка"
            >
              <FolderPlus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTagFolder(node.path); }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-amber)] hover:bg-white/5 rounded transition-colors"
              title="Прив'язати до зони"
            >
              <Tag className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDeleteNode(node); }}
              className="p-1 text-[var(--text-secondary)] hover:text-red-400 hover:bg-white/5 rounded transition-colors"
              title="Видалити папку"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isExpanded && node.children && (
          <div className="w-full">
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onToggleFolder={onToggleFolder}
                onAddFile={onAddFile}
                onAddFolder={onAddFolder}
                onTagFolder={onTagFolder}
                onDeleteNode={onDeleteNode}
                onAnalyze={onAnalyze}
                expandedPaths={expandedPaths}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const ext = node.name.split(".").pop() ?? "";
  return (
    <div className="group flex items-center hover:bg-white/5/40 rounded transition-colors pr-2">
      <button
        type="button"
        onClick={() => onSelectFile(node.path)}
        className={cn(
          "flex-1 flex items-center gap-1.5 py-1.5 text-left text-xs min-w-0",
          isSelected
            ? "bg-[var(--accent-dim)] text-[var(--accent-amber)] font-medium rounded-sm"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        )}
        style={{ paddingLeft: `${20 + level * 12}px` }}
      >
        <span className="shrink-0 text-sm">{iconForFile(node.name)}</span>
        <span className="truncate">{node.name}</span>
        {ext && (
          <span className="text-[8px] px-1 py-0.2 bg-[var(--bg-elevated)] rounded text-[var(--text-muted)] uppercase font-mono shrink-0 ml-auto mr-1 group-hover:hidden">
            {ext}
          </span>
        )}
      </button>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--astryx-text-primary)] hover:bg-white/5 rounded transition-colors p-1"
          title="Analyze"
          onClick={(e) => { e.stopPropagation(); void onAnalyze(node); }}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        </Button>
        <button
          type="button"
          onClick={() => onDeleteNode(node)}
          className="p-1 text-[var(--text-secondary)] hover:text-red-400 hover:bg-white/5 rounded transition-colors"
          title="Видалити файл"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
