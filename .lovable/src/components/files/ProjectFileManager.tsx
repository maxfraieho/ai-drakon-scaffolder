import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText,
  Plus, FolderPlus, FilePlus, Trash2, Edit, Save, Loader2,
  AlertCircle, RefreshCw, PanelLeftClose, PanelLeft, Tag, FileCode,
  Check, Copy, Settings, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getGithubConfig } from "@/lib/settings-storage";
import { fetchNotesTree, fetchNote, commitNote, deleteNote } from "@/lib/garden/notesApi";
import { useProject } from "@/context/ProjectContext";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import Editor from "@monaco-editor/react";
import { ZoneCreationDialog } from "@/components/knowledge/ZoneCreationDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPipelines } from "@/lib/graph-pipeline-api";
import type { PipelineInfo } from "@/lib/graph-pipeline-api";
import { FileTreeItem } from "@/components/workspace/FileTree";
import type { FSNode } from "@/components/workspace/FileTree";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { linkProject } from "@/lib/codegen/linker";

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

function shouldShowEntry(path: string, mode: "all" | "docs" | "code"): boolean {
  if (mode === "docs") return path === "" || path.startsWith("docs");
  if (mode === "code") return !path.startsWith("docs") && !path.startsWith("node_modules");
  return !path.startsWith("node_modules");
}

async function compileDiagramClientSide(name: string, diagram: any, language: string = "JS2604"): Promise<string> {
  const loadScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  };

  // Load all dependencies in order
  await loadScript("/drakongen.js");
  await loadScript("/esprima.js");
  await loadScript("/escodegen.browser.min.js");
  await loadScript("/luaparse.js");
  await loadScript("/drakontechgen.js");

  const errors: string[] = [];
  const codeChunks: string[] = [];

  function onError(err: any) {
    errors.push(err?.message || String(err));
  }

  function onData(chunk: string) {
    codeChunks.push(chunk);
  }

  const stripHtml = (html: string): string => {
    if (!html || !html.includes("<")) return html;
    return html
      .replace(/<\/p>\s*<p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .trim();
  };

  const normalizeParams = (html: string): string => {
    if (!html || !html.includes("<")) return html;
    const items: string[] = [];
    const re = /<li[^>]*>(.*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      if (text) items.push(text);
    }
    return items.length > 0 ? items.join("\n") : stripHtml(html);
  };

  const normalizeItems = (items: any) => {
    if (!items) return items;
    const result: any = {};
    for (const [id, item] of Object.entries(items)) {
      const normalized = { ...(item as any) };
      if (typeof normalized.content === "string") {
        normalized.content = stripHtml(normalized.content);
      }
      if (typeof normalized.secondary === "string") {
        normalized.secondary = stripHtml(normalized.secondary);
      }
      result[id] = normalized;
    }
    return result;
  };

  const normalizedDiagram = {
    type: "drakon",
    name: diagram.name || name,
    items: normalizeItems(diagram.items),
    params: typeof diagram.params === "string" ? normalizeParams(diagram.params) : diagram.params,
  };

  const getObjectByHandle = async (handle: string) => {
    if (handle === "root" || handle === name) {
      return normalizedDiagram;
    }
    return null;
  };

  if (!(window as any).drakontechgen?.buildGenerator) {
    throw new Error("drakontechgen.buildGenerator not available");
  }

  const generator = (window as any).drakontechgen.buildGenerator(
    name,
    "root",
    getObjectByHandle,
    onError,
    onData,
    language,
    "",
    {
      iife: false,
      unit: false,
      dependencies: [],
      outputFile: "",
    }
  );

  await generator.run();

  if (errors.length > 0 && codeChunks.length === 0) {
    throw new Error("Compilation errors:\n" + errors.join("\n"));
  }

  return codeChunks.join("\n");
}

interface ProjectFileManagerProps {
  defaultMode?: "all" | "docs" | "code";
}

export function ProjectFileManager({ defaultMode = "all" }: ProjectFileManagerProps) {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const ghCfg = getGithubConfig();
  const { theme } = useTheme();

  const owner = activeProject?.github?.owner || ghCfg.owner || "";
  const repo = activeProject?.github?.repo || ghCfg.repo || "";
  const branch = activeProject?.github?.branch || ghCfg.branch || "main";
  const token = ghCfg.token || "";
  const isGitHub = !!(owner && repo);

  const [mode, setMode] = useState<"all" | "docs" | "code">(defaultMode);
  const [tree, setTree] = useState<FSNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drakonDiagram, setDrakonDiagram] = useState<any>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const editorRef = useRef<any>(null);

  // Note Details for Local Note Editing
  const [selectedNoteDetails, setSelectedNoteDetails] = useState<{
    slug: string;
    title: string;
    tags: string[];
  } | null>(null);

  // Dialog states
  const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [activeParentPath, setActiveParentPath] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [nodeToDelete, setNodeToDelete] = useState<FSNode | null>(null);
  const [taggingFolderPath, setTaggingFolderPath] = useState("");

  // Analyze states
  const [analyzeTarget, setAnalyzeTarget] = useState<FSNode | null>(null);
  const [analyzeAgent, setAnalyzeAgent] = useState<"architect" | "docs" | "drakon">("architect");
  const [analyzePipelines, setAnalyzePipelines] = useState<PipelineInfo[]>([]);
  const [analyzeSelectedPipeline, setAnalyzeSelectedPipeline] = useState<string>("");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const handleAssembleProject = async () => {
    setLinking(true);
    try {
      let solutionJson = "";
      
      // Read solution.json
      if (isGitHub) {
        const res = await api.githubGetFile(owner, repo, "solution.json", branch, token);
        if (res.success) {
          solutionJson = res.content;
        } else {
          toast.error("Не знайдено solution.json у корені репозиторію GitHub");
          setLinking(false);
          return;
        }
      } else {
        const res = await fetchNote("solution", activeProject?.slug || undefined);
        if (res) {
          solutionJson = res.content;
        } else {
          toast.error("Не знайдено локального solution.json");
          setLinking(false);
          return;
        }
      }

      // Linker file reader implementation
      const getFileFunc = async (path: string): Promise<string> => {
        if (isGitHub) {
          const res = await api.githubGetFile(owner, repo, path, branch, token);
          if (res.success) return res.content;
          throw new Error(`Файл ${path} не знайдено в GitHub`);
        } else {
          const slug = path.replace(/^docs\//, "").replace(/\.md$/, "");
          const res = await fetchNote(slug, activeProject?.slug || undefined);
          if (res) return res.content;
          throw new Error(`Локальний файл ${path} не знайдено`);
        }
      };

      const result = await linkProject(solutionJson, getFileFunc);

      // Save target file
      const ok = await saveSerializedFile(result.targetPath, result.code);
      if (ok) {
        if (result.warnings.length > 0) {
          toast.warning("Проект зібрано з попередженнями", {
            description: result.warnings.join("\n"),
            duration: 10000,
          });
        } else {
          toast.success(`Проект успішно зібрано! Збережено у ${result.targetPath}`);
        }
        await loadRootTree();
      }
    } catch (err) {
      console.error("Failed to link project", err);
      toast.error(`Помилка лінкування: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLinking(false);
    }
  };

  const monacoTheme = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "vs-dark" : "vs-light";

  const mapLocalToFSNode = useCallback((nodes: any[]): FSNode[] => {
    return nodes.map((node) => ({
      name: node.name || (node.slug?.split("/").pop() ?? node.slug ?? ""),
      path: node.path || (node.slug ? `docs/${node.slug}.md` : ""),
      type: node.type === "folder" ? "dir" : "file",
      children: node.children ? mapLocalToFSNode(node.children) : [],
      isLoaded: true,
    }));
  }, []);

  const updateTreeNode = useCallback((
    nodes: FSNode[],
    targetPath: string,
    updater: (node: FSNode) => FSNode
  ): FSNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return updater(node);
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeNode(node.children, targetPath, updater),
        };
      }
      return node;
    });
  }, []);

  const loadRootTree = useCallback(async () => {
    setLoadingTree(true);
    setExpandedPaths(new Set());
    setTree([]);
    try {
      if (isGitHub) {
        const rootPath = mode === "docs" ? "docs" : "";
        const res = await api.githubListTree(owner, repo, rootPath, branch, token);
        if (res.success) {
          let childNodes: FSNode[] = res.entries.map((entry): FSNode => ({
            name: entry.name,
            path: entry.path,
            type: entry.type === "dir" ? "dir" : "file",
            isLoaded: false,
          }));
          if (mode === "code") {
            childNodes = childNodes.filter(n => shouldShowEntry(n.path, "code"));
          }
          setTree(
            childNodes.sort((a, b) => {
              if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
          );
        } else {
          toast.error("Не вдалося завантажити дерево файлів");
        }
      } else if (mode === "docs") {
        const localTree = await fetchNotesTree(activeProject?.slug || undefined);
        setTree(mapLocalToFSNode(localTree));
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка при завантаженні дерева");
    } finally {
      setLoadingTree(false);
    }
  }, [mode, owner, repo, branch, token, isGitHub, activeProject?.slug, mapLocalToFSNode]);

  useEffect(() => {
    void loadRootTree();
  }, [loadRootTree]);

  const toggleFolder = async (node: FSNode) => {
    const path = node.path;
    const nextExpanded = new Set(expandedPaths);
    if (nextExpanded.has(path)) {
      nextExpanded.delete(path);
      setExpandedPaths(nextExpanded);
    } else {
      nextExpanded.add(path);
      setExpandedPaths(nextExpanded);
      if (!node.isLoaded && isGitHub) {
        setTree((prev) =>
          updateTreeNode(prev, path, (n) => ({ ...n, isLoading: true }))
        );
        try {
          const res = await api.githubListTree(owner, repo, path, branch, token);
          if (res.success) {
            const childNodes: FSNode[] = res.entries
              .map((entry): FSNode => ({
                name: entry.name,
                path: entry.path,
                type: entry.type === "dir" ? "dir" : "file",
                isLoaded: false,
              }))
              .filter((n) => shouldShowEntry(n.path, mode));
            setTree((prev) =>
              updateTreeNode(prev, path, (n) => ({
                ...n,
                children: childNodes.sort((a, b) => {
                  if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
                  return a.name.localeCompare(b.name);
                }),
                isLoaded: true,
                isLoading: false,
              }))
            );
          } else {
            toast.error("Не вдалося завантажити папку");
            setTree((prev) =>
              updateTreeNode(prev, path, (n) => ({ ...n, isLoading: false }))
            );
          }
        } catch {
          toast.error("Помилка завантаження");
          setTree((prev) =>
            updateTreeNode(prev, path, (n) => ({ ...n, isLoading: false }))
          );
        }
      }
    }
  };

  const saveSerializedFile = async (path: string, content: string) => {
    if (!path) return false;
    try {
      if (isGitHub) {
        const message = `edit(${path.split("/").pop()}): update via ProjectFileManager`;
        const res = await api.githubCommitFile(owner, repo, path, content, message, branch, token);
        if (res.success) {
          toast.success("Збережено в GitHub");
          if (res.commitSha) setFileSha(res.commitSha);
          return true;
        } else {
          toast.error("Помилка збереження в GitHub");
          return false;
        }
      } else {
        const slug = path.replace(/^docs\//, "").replace(/\.md$/, "");
        const title = selectedNoteDetails?.title || slug.split("/").pop() || slug;
        const tags = selectedNoteDetails?.tags || [];
        const res = await commitNote({
          slug,
          title,
          content,
          tags,
          sha: fileSha || undefined,
          project: activeProject?.slug || undefined,
        });
        if (res.success) {
          toast.success("Збережено локально");
          if (res.sha) setFileSha(res.sha);
          return true;
        } else {
          toast.error("Помилка збереження");
          return false;
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка при збереженні");
      return false;
    }
  };

  const openFile = async (path: string) => {
    setLoadingFile(true);
    try {
      if (isGitHub) {
        const res = await api.githubGetFile(owner, repo, path, branch, token);
        if (res.success) {
          setCode(res.content);
          setFilePath(path);
          setFileSha(res.sha);
          setSelectedNoteDetails(null);
          if (path.endsWith(".drakon")) {
            try {
              setDrakonDiagram(JSON.parse(res.content));
            } catch (err) {
              console.error("Failed to parse .drakon file", err);
              setDrakonDiagram(null);
            }
          } else {
            setDrakonDiagram(null);
          }
        } else {
          toast.error("Не вдалося завантажити файл з GitHub");
        }
      } else {
        const slug = path.replace(/^docs\//, "").replace(/\.md$/, "");
        const res = await fetchNote(slug, activeProject?.slug || undefined);
        if (res) {
          setCode(res.content);
          setFilePath(path);
          setFileSha(res.sha || "");
          setSelectedNoteDetails({
            slug,
            title: res.title,
            tags: res.tags || [],
          });
          if (path.endsWith(".drakon")) {
            try {
              setDrakonDiagram(JSON.parse(res.content));
            } catch (err) {
              console.error("Failed to parse local .drakon note", err);
              setDrakonDiagram(null);
            }
          } else {
            setDrakonDiagram(null);
          }
        } else {
          toast.error("Не вдалося завантажити локальний документ");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка завантаження файлу");
    } finally {
      setLoadingFile(false);
    }
  };

  const saveFile = async () => {
    if (!filePath) return;
    setSaving(true);
    await saveSerializedFile(filePath, code);
    setSaving(false);
  };

  const handleSaveDiagramOverride = async (diagram: any) => {
    const serialized = JSON.stringify(diagram, null, 2);
    setCode(serialized);
    setDrakonDiagram(diagram);
    
    // Save the .drakon file
    const ok = await saveSerializedFile(filePath, serialized);
    if (!ok) return false;

    // Compile diagram and save the compiled code file too
    try {
      const functionName = filePath.split("/").pop()?.replace(/\.drakon$/, "") || "function";
      
      // Determine the target language (default to JavaScript / .js)
      let language = "JS2604";
      let codeExtension = ".js";
      if (filePath.toLowerCase().includes("lua")) {
        language = "Lua2604";
        codeExtension = ".lua";
      }

      const compiledCode = await compileDiagramClientSide(functionName, diagram, language);
      const compiledPath = filePath.replace(/\.drakon$/, codeExtension);
      
      // Commit the compiled code to GitHub/Notes
      await saveSerializedFile(compiledPath, compiledCode);
      toast.success(`Згенеровано та збережено код: ${compiledPath.split("/").pop()}`);
    } catch (err) {
      console.error("Failed to compile diagram on save", err);
      toast.error(`Помилка компіляції: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    return true;
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPos({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Creation logic
  const handleAddFile = (parentPath: string) => {
    setActiveParentPath(parentPath);
    setNewItemName("");
    setShowCreateFileDialog(true);
  };

  const handleAddFolder = (parentPath: string) => {
    setActiveParentPath(parentPath);
    setNewItemName("");
    setShowCreateFolderDialog(true);
  };

  const handleTagFolder = (parentPath: string) => {
    setTaggingFolderPath(parentPath);
    setShowZoneDialog(true);
  };

  const handleDeleteNode = (node: FSNode) => {
    setNodeToDelete(node);
    setShowDeleteConfirmDialog(true);
  };

  const confirmCreateFile = async () => {
    const name = newItemName.trim();
    if (!name) return;
    const parentPath = activeParentPath;
    const finalPath = parentPath ? `${parentPath}/${name}` : name;
    
    setShowCreateFileDialog(false);
    setSaving(true);
    try {
      if (isGitHub) {
        const res = await api.githubCommitFile(owner, repo, finalPath, "", `create file ${finalPath}`, branch, token);
        if (res.success) {
          toast.success("Файл створено на GitHub");
          await loadRootTree();
          await openFile(finalPath);
        } else {
          toast.error("Не вдалося створити файл");
        }
      } else {
        const slug = finalPath.replace(/^docs\//, "").replace(/\.md$/, "");
        const title = name.replace(/\.md$/, "");
        const res = await commitNote({
          slug,
          title,
          content: "",
          tags: [],
          project: activeProject?.slug || undefined,
        });
        if (res.success) {
          toast.success("Локальний документ створено");
          await loadRootTree();
          await openFile(finalPath);
        } else {
          toast.error("Не вдалося створити документ");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка створення файлу");
    } finally {
      setSaving(false);
    }
  };

  const confirmCreateFolder = async () => {
    const name = newItemName.trim();
    if (!name) return;
    const parentPath = activeParentPath;
    const finalPath = parentPath ? `${parentPath}/${name}` : name;

    setShowCreateFolderDialog(false);
    setSaving(true);
    try {
      if (isGitHub) {
        const placeholderPath = `${finalPath}/.gitkeep`;
        const res = await api.githubCommitFile(owner, repo, placeholderPath, "", `create folder ${finalPath}`, branch, token);
        if (res.success) {
          toast.success("Папку створено на GitHub");
          await loadRootTree();
        } else {
          toast.error("Не вдалося створити папку");
        }
      } else {
        // Local folder creation simply registers folder by creating an empty note in it
        const dummyPath = `${finalPath}/.placeholder`;
        const slug = dummyPath.replace(/^docs\//, "").replace(/\.md$/, "");
        const res = await commitNote({
          slug,
          title: ".placeholder",
          content: "",
          tags: [],
          project: activeProject?.slug || undefined,
        });
        if (res.success) {
          toast.success("Локальну папку створено");
          await loadRootTree();
        } else {
          toast.error("Не вдалося створити папку");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка створення папки");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteNode = async () => {
    if (!nodeToDelete) return;
    setShowDeleteConfirmDialog(false);
    setSaving(true);
    try {
      if (isGitHub) {
        if (!token) {
          toast.error("Для видалення файлів з GitHub потрібен токен");
          return;
        }
        
        const deleteItem = async (node: FSNode) => {
          if (node.type === "file") {
            const getRes = await api.githubGetFile(owner, repo, node.path, branch, token);
            if (!getRes.success) return;
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}`, {
              method: "DELETE",
              headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: `delete(${node.name}): delete via AI-DRAKON`,
                sha: getRes.sha,
                branch,
              }),
            });
            if (!res.ok) {
              throw new Error(`GitHub API delete error for ${node.path}`);
            }
          } else if (node.type === "dir") {
            // Recursively fetch children to delete all
            const listRes = await api.githubListTree(owner, repo, node.path, branch, token);
            if (listRes.success) {
              for (const entry of listRes.entries) {
                const childNode: FSNode = {
                  name: entry.name,
                  path: entry.path,
                  type: entry.type === "dir" ? "dir" : "file",
                };
                await deleteItem(childNode);
              }
            }
          }
        };

        await deleteItem(nodeToDelete);
        toast.success("Елемент видалено з GitHub");
        if (filePath === nodeToDelete.path || filePath.startsWith(nodeToDelete.path + "/")) {
          setCode("");
          setFilePath("");
          setFileSha(null);
        }
        await loadRootTree();
      } else {
        // Local mode delete
        const deleteLocalItem = async (node: FSNode) => {
          if (node.type === "file") {
            const slug = node.path.replace(/^docs\//, "").replace(/\.md$/, "");
            await deleteNote(slug, activeProject?.slug || undefined);
          } else if (node.type === "dir" && node.children) {
            for (const child of node.children) {
              await deleteLocalItem(child);
            }
          }
        };

        await deleteLocalItem(nodeToDelete);
        toast.success("Елемент видалено локально");
        if (filePath === nodeToDelete.path || filePath.startsWith(nodeToDelete.path + "/")) {
          setCode("");
          setFilePath("");
          setFileSha(null);
        }
        await loadRootTree();
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка видалення елемента");
    } finally {
      setSaving(false);
      setNodeToDelete(null);
    }
  };

  // Search filter tree
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();
    
    const filterNodes = (nodes: FSNode[]): FSNode[] => {
      return nodes
        .map((node) => {
          const matches = node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q);
          if (node.type === "dir" && node.children) {
            const filteredChildren = filterNodes(node.children);
            if (filteredChildren.length > 0 || matches) {
              return { ...node, children: filteredChildren };
            }
          }
          return matches ? node : null;
        })
        .filter((n): n is FSNode => n !== null);
    };

    return filterNodes(tree);
  }, [tree, searchQuery]);

  // Analyze Target Logic
  const openAnalyzeDialog = async (node: FSNode) => {
    setAnalyzeTarget(node);
    setAnalyzeDialogOpen(true);
    try {
      const pipelines = await listPipelines();
      setAnalyzePipelines(pipelines);
      if (pipelines.length > 0) setAnalyzeSelectedPipeline(pipelines[0].name);
    } catch {
      setAnalyzePipelines([]);
    }
  };

  const runAnalyze = () => {
    if (!analyzeTarget) return;
    setAnalyzeDialogOpen(false);
    void navigate({
      to: "/diagrams",
      search: {
        autoAnalyze: "true",
        analyzePath: analyzeTarget.path || "src",
        analyzeRepo: `${owner}/${repo}`,
        analyzeBranch: branch,
      } as Record<string, string>,
    });
    toast.message("Analyze started", { description: `/${analyzeTarget.path} via ${analyzeAgent}` });
  };

  // Sidebar Header text
  const sidebarHeader = isGitHub ? `${repo}` : "Vault";

  if (!isGitHub && mode !== "docs") {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm p-6 bg-[var(--bg-surface)]/40 border border-[var(--border-subtle)]/80 rounded-lg backdrop-blur">
          <FileCode className="h-10 w-10 text-[var(--accent-amber)] animate-pulse" />
          <div>
            <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              Репозиторій не обрано
            </h3>
            <p className="mt-2 font-mono text-xs text-[var(--text-muted)] leading-relaxed">
              Режими All та Code потребують активного репозиторію GitHub. Оберіть репозиторій зі списку.
            </p>
          </div>
          <button
            type="button"
            onClick={() => document.dispatchEvent(new CustomEvent("open-add-repo"))}
            className="inline-flex items-center gap-2 rounded px-4 py-1.5 font-mono text-[11px] font-medium bg-[var(--accent-amber)] text-black hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Settings className="h-3.5 w-3.5" />
            Обрати репозиторій
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg-base)]">
      {/* Collapsible Sidebar */}
      <aside className={cn(
        "shrink-0 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/60 backdrop-blur-md transition-[width] duration-200 overflow-hidden",
        sidebarOpen ? "w-56" : "w-0 border-r-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-subtle)] shrink-0">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate flex-1 mr-2">
            {sidebarHeader}
          </span>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleAddFile("")}
              className="p-1 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Новий файл в коліні"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleAddFolder("")}
              className="p-1 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Нова папка в коліні"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Сховати бічну панель"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-2.5 py-2 shrink-0 flex gap-1 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setMode("all")}
            disabled={!isGitHub}
            className={cn(
              "flex-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border font-mono transition-all",
              mode === "all"
                ? "bg-[var(--accent-dim)] border-[var(--accent-amber)]/30 text-[var(--accent-amber)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
            )}
          >
            All
          </button>
          <button
            onClick={() => setMode("docs")}
            className={cn(
              "flex-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border font-mono transition-all",
              mode === "docs"
                ? "bg-[var(--accent-dim)] border-[var(--accent-amber)]/30 text-[var(--accent-amber)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            /docs
          </button>
          <button
            onClick={() => setMode("code")}
            disabled={!isGitHub}
            className={cn(
              "flex-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border font-mono transition-all",
              mode === "code"
                ? "bg-[var(--accent-dim)] border-[var(--accent-amber)]/30 text-[var(--accent-amber)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
            )}
          >
            Code
          </button>
        </div>

        {/* Search */}
        <div className="px-2 py-1.5 shrink-0 border-b border-[var(--border-subtle)]">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук..."
            className="h-7 text-xs bg-[var(--bg-surface)]/60 border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-[var(--accent-amber)]/40"
          />
        </div>

        {/* Tree List */}
        <ScrollArea className="flex-1 p-2">
          {loadingTree ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)] font-mono">
              Файлів не знайдено
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTree.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  level={0}
                  selectedPath={filePath}
                  onSelectFile={openFile}
                  onToggleFolder={toggleFolder}
                  onAddFile={handleAddFile}
                  onAddFolder={handleAddFolder}
                  onTagFolder={handleTagFolder}
                  onDeleteNode={handleDeleteNode}
                  onAnalyze={openAnalyzeDialog}
                  expandedPaths={expandedPaths}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Show sidebar toggle if collapsed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="h-full w-6 shrink-0 flex items-center justify-center border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/20 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Показати бічну панель"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-base)]">
        {/* Center Toolbar */}
        <div className="h-10 px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur shrink-0 flex items-center justify-between">
          {/* Breadcrumbs */}
          <div className="font-mono text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1.5">
            <span className="text-[var(--text-muted)] font-bold">PROJECT:</span>
            <span>{sidebarHeader}</span>
            {filePath && (
              <>
                <span className="text-[var(--border-subtle)]">/</span>
                <span className="text-[var(--text-primary)] font-bold">{filePath}</span>
              </>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isGitHub && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                branch: {branch}
              </span>
            )}

            <Button
              onClick={handleAssembleProject}
              disabled={linking}
              size="sm"
              variant="outline"
              className="h-7 font-mono text-[11px] gap-1 px-3 border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Зібрати проект згідно з solution.json"
            >
              {linking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-amber)]" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {linking ? "Збірка..." : "Зібрати проект"}
            </Button>
            
            {filePath && !filePath.endsWith(".drakon") && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={copyCode}
                  title="Копіювати код"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                
                <Button
                  onClick={saveFile}
                  disabled={saving}
                  size="sm"
                  className="h-7 font-mono text-[11px] gap-1 px-3 bg-[var(--accent-amber)] hover:brightness-110 text-black active:scale-[0.98] transition-all"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Зберегти
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 min-h-0 relative">
          {filePath ? (
            <div className="w-full h-full flex flex-col">
              {loadingFile && (
                <div className="absolute inset-0 bg-[var(--bg-base)]/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 font-mono text-xs text-[var(--text-secondary)]">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-amber)]" />
                    Завантаження файлу...
                  </div>
                </div>
              )}
              {filePath.endsWith(".drakon") && drakonDiagram ? (
                <div className="flex-1 min-h-0 p-4">
                  <DrakonEditor
                    diagram={drakonDiagram}
                    diagramId={filePath}
                    onSaveOverride={handleSaveDiagramOverride}
                  />
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={detectLang(filePath)}
                  value={code}
                  theme={monacoTheme}
                  onChange={(v) => setCode(v ?? "")}
                  onMount={handleEditorDidMount}
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
                    bracketPairColorization: { enabled: true },
                  }}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[var(--text-muted)] font-mono">
              <FileCode className="h-12 w-12 opacity-20 text-[var(--accent-amber)]" />
              <p className="text-xs">Оберіть файл для перегляду та редагування</p>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-6 px-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            {filePath ? (
              <>
                <span className="text-[var(--text-secondary)] font-bold truncate">{filePath.split("/").pop()}</span>
                <span className="text-[var(--border-subtle)]">|</span>
                <span className="text-[var(--text-muted)] uppercase">{detectLang(filePath)}</span>
              </>
            ) : (
              <span>Немає активного файлу</span>
            )}
          </div>
          <div>
            {filePath && (
              <span>Рядок {cursorPos.line}, Колонка {cursorPos.column}</span>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showCreateFileDialog} onOpenChange={setShowCreateFileDialog}>
        <DialogContent className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase text-[var(--accent-amber)]">Новий файл</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="file-name" className="text-xs text-[var(--text-secondary)]">Назва файлу з розширенням</Label>
            <Input
              id="file-name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="index.ts або readme.md"
              className="mt-2 text-xs bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--accent-amber)]/40"
              onKeyDown={(e) => e.key === "Enter" && confirmCreateFile()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateFileDialog(false)} className="text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]">
              Скасувати
            </Button>
            <Button onClick={confirmCreateFile} size="sm" className="text-xs bg-[var(--accent-amber)] hover:brightness-110 text-black">
              Створити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase text-[var(--accent-amber)]">Нова папка</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="folder-name" className="text-xs text-[var(--text-secondary)]">Назва папки</Label>
            <Input
              id="folder-name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="docs або utils"
              className="mt-2 text-xs bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--accent-amber)]/40"
              onKeyDown={(e) => e.key === "Enter" && confirmCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateFolderDialog(false)} className="text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]">
              Скасувати
            </Button>
            <Button onClick={confirmCreateFolder} size="sm" className="text-xs bg-[var(--accent-amber)] hover:brightness-110 text-black">
              Створити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase text-red-500">Видалити елемент?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            Ви впевнені, що хочете видалити <span className="text-[var(--text-primary)] font-bold">{nodeToDelete?.name}</span>?
            {nodeToDelete?.type === "dir" && " Ця дія рекурсивно видалить ВСІ вкладені файли та папки!"}
            <p className="mt-2 text-red-400/80 font-bold">Ця дія є незворотною.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirmDialog(false)} className="text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]">
              Скасувати
            </Button>
            <Button onClick={confirmDeleteNode} size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white">
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ZoneCreationDialog
        isOpen={showZoneDialog}
        onClose={() => setShowZoneDialog(false)}
        initialFolders={[taggingFolderPath]}
      />

      <Dialog open={analyzeDialogOpen} onOpenChange={setAnalyzeDialogOpen}>
        <DialogContent className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase text-[var(--accent-amber)]">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Analyze: /{analyzeTarget?.path || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)]">Agent</Label>
              <Select value={analyzeAgent} onValueChange={(v) => setAnalyzeAgent(v as "architect" | "docs" | "drakon")}>
                <SelectTrigger className="h-8 text-xs bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:ring-[var(--accent-amber)]/40"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  <SelectItem value="architect">Architect (DRAKON diagrams)</SelectItem>
                  <SelectItem value="docs">Docs (documentation)</SelectItem>
                  <SelectItem value="drakon">Drakon (generation)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)]">Pipeline (results target)</Label>
              <Select value={analyzeSelectedPipeline} onValueChange={setAnalyzeSelectedPipeline}>
                <SelectTrigger className="h-8 text-xs bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:ring-[var(--accent-amber)]/40"><SelectValue placeholder="New pipeline" /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  <SelectItem value="">New pipeline</SelectItem>
                  {analyzePipelines.map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAnalyzeDialogOpen(false)} className="text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]">
              Скасувати
            </Button>
            <Button onClick={runAnalyze} size="sm" className="text-xs bg-[var(--accent-amber)] hover:brightness-110 text-black">
              <Sparkles className="mr-2 h-3 w-3" /> Analyze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
