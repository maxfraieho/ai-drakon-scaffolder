import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Copy, Check, FileCode, FolderOpen,
  Play, Save, Loader2, AlertCircle, RefreshCw, Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getGithubConfig } from "@/lib/settings-storage";
import { startAnalysis, pollJob, type AnalyzeResult } from "@/lib/pipeline-api";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useProject } from "@/context/ProjectContext";



const EXT_TO_LANG: Record<string, string> = {
  py: "python", ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript", json: "json",
  yaml: "yaml", yml: "yaml", md: "markdown", sh: "shell",
  html: "html", css: "css", scss: "css", sql: "sql",
  rs: "rust", go: "go", java: "java", cpp: "cpp", c: "c",
  toml: "ini", txt: "plaintext",
};

function detectLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

// ── File tree ────────────────────────────────────────────────────────────────

interface TreeEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

function FileTree({
  owner, repo, branch, token,
  onFileSelect, selectedPath,
}: {
  owner: string; repo: string; branch: string; token: string;
  onFileSelect: (path: string) => void;
  selectedPath: string;
}) {
  const [entries, setEntries] = useState<TreeEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (path: string) => {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.githubListTree(owner, repo, path, branch, token);
      if (res.success) {
        const sorted = [...res.entries].sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      } else {
        setError("Не вдалося завантажити");
      }
    } catch {
      setError("Помилка з'єднання");
    } finally {
      setLoading(false);
    }
  }, [owner, repo, branch, token]);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    setCurrentPath("");
    setPathStack([]);
  }, [owner, repo]);

  const enterDir = (entry: TreeEntry) => {
    setPathStack((s) => [...s, currentPath]);
    setCurrentPath(entry.path);
    load(entry.path);
  };

  const goBack = () => {
    const prev = pathStack[pathStack.length - 1] ?? "";
    setPathStack((s) => s.slice(0, -1));
    setCurrentPath(prev);
    load(prev);
  };

  const refresh = () => load(currentPath);

  if (!owner || !repo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-3">
        <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="font-mono text-[9px] text-[var(--text-muted)] text-center">
          Налаштуйте GitHub у вкладці Налаштування
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        {pathStack.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-white/5 text-[var(--text-muted)]"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}
        <span className="font-mono text-[9px] text-[var(--text-muted)] truncate flex-1">
          {currentPath || repo}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-white/5 text-[var(--text-muted)]"
        >
          <RefreshCw className={cn("h-2.5 w-2.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto py-1">
        {error && (
          <div className="px-3 py-2 font-mono text-[9px] text-red-400">{error}</div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className="px-3 py-2 font-mono text-[9px] text-[var(--text-muted)]">
            Порожня папка
          </div>
        )}
        {entries.map((entry) => (
          <button
            key={entry.path}
            type="button"
            onClick={() => entry.type === "dir" ? enterDir(entry) : onFileSelect(entry.path)}
            className={cn(
              "w-full flex items-center gap-1.5 px-2 py-1 text-left transition-colors",
              entry.type === "file" && selectedPath === entry.path
                ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                : "hover:bg-white/5 text-[var(--text-secondary)]",
            )}
          >
            {entry.type === "dir"
              ? <FolderOpen className="h-3 w-3 shrink-0 text-[var(--accent-amber)]/70" />
              : <FileCode className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
            }
            <span className="font-mono text-[10px] truncate">{entry.name}</span>
            {entry.type === "dir" && (
              <ChevronRight className="h-2.5 w-2.5 shrink-0 ml-auto text-[var(--text-muted)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Code page ─────────────────────────────────────────────────────────────────

export default function CodePage() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const ghCfg = getGithubConfig();

  // Settings GitHub завжди має пріоритет якщо явно задано.
  // activeProject.github використовується тільки як fallback.
  const projectGh = activeProject?.github;
  const owner = ghCfg.owner || projectGh?.owner || "";
  const repo  = ghCfg.repo  || projectGh?.repo  || "";
  const branch = ghCfg.branch || projectGh?.branch || "main";
  const token = ghCfg.token || "";

  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("untitled.py");
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setCode("");
    setFilePath("untitled.py");
    setFileSha(null);
    setResult(null);
  }, [owner, repo, branch]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);
  const monacoTheme = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "vs-dark" : "vs-light";

  // Load file from GitHub
  const openFile = useCallback(async (path: string) => {
    if (!owner || !repo) return;
    setLoadingFile(true);
    try {
      const res = await api.githubGetFile(owner, repo, path, branch, token);
      if (res.success) {
        setCode(res.content);
        setFilePath(path);
        setFileSha(res.sha);
        setResult(null);
      } else {
        toast.error("Не вдалося завантажити файл");
      }
    } catch {
      toast.error("Помилка завантаження файлу");
    } finally {
      setLoadingFile(false);
    }
  }, [owner, repo, branch, token]);

  // Save to git
  const saveToGit = useCallback(async () => {
    if (!owner || !repo) {
      toast.error("Проект не має GitHub конфігу");
      return;
    }
    if (!code.trim()) { toast.error("Файл порожній"); return; }
    setSaving(true);
    try {
      const message = `edit(${filePath.split("/").pop()}): update via AI-DRAKON code editor`;
      const res = await api.githubCommitFile(owner, repo, filePath, code, message, branch, token);
      if (res.success) {
        toast.success("Збережено в git");
        if (res.commitSha) setFileSha(res.commitSha);
      } else {
        toast.error("Помилка збереження в git");
      }
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSaving(false);
    }
  }, [owner, repo, branch, token, filePath, code]);

  // Run Pipeline A
  const analyze = useCallback(async () => {
    if (!code.trim()) { toast.error("Код порожній"); return; }
    setAnalyzing(true);
    setResult(null);
    try {
      const { job_id } = await startAnalysis(code, filePath);
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(pollRef.current!);
          setAnalyzing(false);
          toast.error("Timeout");
          return;
        }
        try {
          const status = await pollJob<AnalyzeResult>(job_id);
          if (status.status === "done" && status.result) {
            clearInterval(pollRef.current!);
            setAnalyzing(false);
            setResult(status.result);
            toast.success("Аналіз завершено", {
              action: { label: "Відкрити схему", onClick: () => navigate({ to: "/diagrams" }) },
            });
          } else if (status.status === "error") {
            clearInterval(pollRef.current!);
            setAnalyzing(false);
            toast.error(status.error ?? "Помилка аналізу");
          }
        } catch {}
      }, 1500);
    } catch {
      setAnalyzing(false);
      toast.error("Не вдалося запустити аналіз");
    }
  }, [code, filePath]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToDiagram = (fn: AnalyzeResult["drakon_ir"][number]) => {
    sessionStorage.setItem("pending_ir", JSON.stringify(fn));
    navigate({ to: "/diagrams" });
  };

  // Early return if GitHub not configured
  if (!ghCfg.token || !ghCfg.owner || !ghCfg.repo) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <FileCode className="h-10 w-10 text-[var(--text-muted)]" />
          <div>
            <p className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
              GitHub не налаштований
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Додайте токен та репозиторій у Налаштуваннях
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/settings" })}
            className="inline-flex items-center gap-2 rounded px-4 py-1.5 font-mono text-[11px] font-medium bg-[var(--accent-amber)] text-[#1a1000] hover:brightness-110 transition-all"
          >
            <Cog className="h-3.5 w-3.5" />
            Відкрити Налаштування
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)] md:flex-row">
      {/* File tree panel */}
      <div className={cn(
        "shrink-0 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[width] duration-200 overflow-hidden",
        treeCollapsed ? "w-0 border-r-0" : "w-44",
        "hidden md:flex",
      )}>
        <div className="px-2 py-1.5 border-b border-[var(--border-subtle)] shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {repo || "Файли проекту"}
          </span>
        </div>
        <FileTree
          owner={owner} repo={repo} branch={branch} token={token}
          onFileSelect={openFile}
          selectedPath={filePath}
        />
      </div>

      {/* Toggle tree */}
      <button
        type="button"
        onClick={() => setTreeCollapsed((v) => !v)}
        className="hidden h-full w-2 shrink-0 items-center justify-center border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-dim)] hover:text-[var(--accent-amber)] cursor-pointer md:flex"
        title={treeCollapsed ? "Показати файли" : "Сховати файли"}
      >
        {treeCollapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>

      {/* Editor */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <FileCode className="h-3.5 w-3.5 text-[var(--accent-amber)] shrink-0" />
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            className="font-mono text-[11px] text-[var(--text-secondary)] bg-transparent outline-none flex-1 min-w-0"
            placeholder="path/to/file.py"
          />
          {loadingFile && <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)] shrink-0" />}
          <Button
            variant="ghost" size="sm"
            className="h-6 gap-1 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 shrink-0"
            onClick={copyCode}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost" size="sm"
            disabled={saving}
            onClick={saveToGit}
            className="h-6 gap-1 font-mono text-[10px] text-[var(--text-muted)] hover:text-green-400 px-2 shrink-0"
            title="Зберегти в git"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
        </div>

        <Editor
          height="100%"
          language={detectLang(filePath)}
          value={code}
          theme={monacoTheme}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineHeight: 18,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            padding: { top: 12, bottom: 12 },
            wordWrap: "on",
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            overviewRulerLanes: 0,
          }}
        />
      </div>

      {/* Pipeline A panel */}
      <div className="flex h-44 w-full shrink-0 flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] md:h-auto md:w-48 md:border-t-0 md:border-l">
        <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Pipeline A
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <Button
            onClick={analyze}
            disabled={analyzing || !code.trim()}
            className="w-full h-8 font-mono text-[11px] gap-2 bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110"
          >
            <Play className="h-3 w-3" />
            {analyzing ? "Аналізує..." : "Аналізувати"}
          </Button>

          {analyzing && (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)] animate-pulse" />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">architect-agent</span>
            </div>
          )}

          {result && result.drakon_ir.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Функції ({result.drakon_ir.length})
              </div>
              {result.drakon_ir.map((fn) => (
                <button
                  key={fn.name}
                  type="button"
                  onClick={() => goToDiagram(fn)}
                  className="w-full text-left rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-2 hover:border-[var(--accent-amber)] hover:bg-[var(--accent-dim)] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono text-[10px] text-[var(--text-primary)] break-all leading-tight">
                      {fn.name.split(".").pop()}
                    </span>
                    <ChevronRight className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--accent-amber)] shrink-0 mt-0.5" />
                  </div>
                  {fn.cyclomatic_complexity !== undefined && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn(
                        "font-mono text-[9px] px-1 rounded",
                        fn.cyclomatic_complexity <= 10 && "bg-green-500/15 text-green-400",
                        fn.cyclomatic_complexity > 10 && fn.cyclomatic_complexity <= 20 && "bg-yellow-500/15 text-yellow-400",
                        fn.cyclomatic_complexity > 20 && "bg-red-500/15 text-red-400",
                      )}>
                        CC={fn.cyclomatic_complexity}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">
                        {result.tree_level}
                      </span>
                    </div>
                  )}
                </button>
              ))}

              <button
                onClick={() => navigate({ to: "/diagrams" })}
                className="mt-2 text-xs font-mono text-[var(--accent)] underline hover:opacity-80"
              >
                → Переглянути в /diagrams
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
