import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, ChevronRight, ChevronDown } from "lucide-react";
import { api, type CreateKnowledgeZoneRequest, type KnowledgeZone } from "@/lib/api";
import { ZoneCreatedDialog } from "./ZoneCreatedDialog";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";
import { getGithubConfig } from "@/lib/settings-storage";

interface GHFolderNode {
  name: string;
  path: string;
  children?: GHFolderNode[];
  isLoaded?: boolean;
  isLoading?: boolean;
}

interface FolderItemProps {
  name: string;
  path: string;
  isSelected: boolean;
  onToggle: (path: string) => void;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onExpandToggle: () => void;
}

function FolderItem({
  name,
  path,
  isSelected,
  onToggle,
  depth,
  hasChildren,
  isExpanded,
  onExpandToggle,
}: FolderItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer",
        isSelected && "bg-primary/10"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onToggle(path)}
    >
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpandToggle();
          }}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      ) : (
        <span className="w-5" />
      )}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(path)}
        onClick={(e) => e.stopPropagation()}
        className="data-[state=checked]:bg-primary"
      />
      <Folder className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm truncate">{name}</span>
    </div>
  );
}

interface ZoneCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolders?: string[];
}

export function ZoneCreationDialog({
  isOpen,
  onClose,
  initialFolders,
}: ZoneCreationDialogProps) {
  const queryClient = useQueryClient();
  const { activeProject } = useProject();
  const ghCfg = getGithubConfig();
  const owner = activeProject?.github?.owner || ghCfg.owner || "";
  const repo = activeProject?.github?.repo || ghCfg.repo || "";
  const branch = activeProject?.github?.branch || ghCfg.branch || "main";
  const token = ghCfg.token || "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState(1440); // default 24h
  const [accessType, setAccessType] = useState<
    CreateKnowledgeZoneRequest["accessType"]
  >("web");
  const [createNotebookLm, setCreateNotebookLm] = useState(false);
  const [notebookLmTitle, setNotebookLmTitle] = useState("");
  const [shareEmails, setShareEmails] = useState("");

  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [createdZone, setCreatedZone] = useState<KnowledgeZone | null>(null);
  const [showCreatedDialog, setShowCreatedDialog] = useState(false);

  const [ghTree, setGhTree] = useState<GHFolderNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);

  // Recursive helper to update a node in the tree
  const updateGHNode = useCallback(
    (nodes: GHFolderNode[], path: string, updater: (n: GHFolderNode) => GHFolderNode): GHFolderNode[] =>
      nodes.map(n =>
        n.path === path
          ? updater(n)
          : { ...n, children: n.children ? updateGHNode(n.children, path, updater) : undefined }
      ),
    []
  );

  // Load children of a folder on expand
  const loadChildren = useCallback(async (node: GHFolderNode) => {
    if (node.isLoaded || node.isLoading) return;
    setGhTree(prev => updateGHNode(prev, node.path, n => ({ ...n, isLoading: true })));
    try {
      const res = await api.githubListTree(owner, repo, node.path, branch, token || undefined);
      if (res.success) {
        const children: GHFolderNode[] = res.entries
          .filter((e: { type: string }) => e.type === "dir")
          .map((e: { name: string; path: string }) => ({ name: e.name, path: e.path }));
        setGhTree(prev => updateGHNode(prev, node.path, n => ({ ...n, children, isLoaded: true, isLoading: false })));
      }
    } catch {
      setGhTree(prev => updateGHNode(prev, node.path, n => ({ ...n, isLoading: false })));
    }
  }, [owner, repo, branch, token, updateGHNode]);

  useEffect(() => {
    if (isOpen) {
      if (initialFolders && initialFolders.length > 0) {
        setSelectedFolders(new Set(initialFolders));
        const expanded = new Set<string>();
        for (const f of initialFolders) {
          const parts = f.split("/");
          let acc = "";
          for (const p of parts) {
            acc = acc ? `${acc}/${p}` : p;
            expanded.add(acc);
          }
        }
        setExpandedFolders(expanded);
      } else {
        setSelectedFolders(new Set());
        setExpandedFolders(new Set());
      }
      // Load root GitHub tree
      if (owner && repo) {
        setTreeLoading(true);
        setGhTree([]);
        api.githubListTree(owner, repo, "", branch, token || undefined)
          .then(res => {
            if (res.success) {
              setGhTree(
                res.entries
                  .filter((e: { type: string }) => e.type === "dir")
                  .map((e: { name: string; path: string }) => ({ name: e.name, path: e.path }))
              );
            }
          })
          .finally(() => setTreeLoading(false));
      }
    }
  }, [isOpen, initialFolders, owner, repo, branch, token]);

  const createZoneMutation = useMutation({
    mutationFn: (data: CreateKnowledgeZoneRequest) => api.createKnowledgeZone(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Knowledge zone created successfully.");
        queryClient.invalidateQueries({ queryKey: ["knowledgeZones"] });
        if (response.zone?.accessCode) {
          setCreatedZone(response.zone);
          setShowCreatedDialog(true);
        } else {
          handleClose();
        }
      } else {
        toast.error(response.message || "Failed to create knowledge zone.");
      }
    },
    onError: (err) => {
      toast.error(`Error creating knowledge zone: ${err.message}`);
    },
  });

  const toggleFolder = (path: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleExpand = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allPaths = new Set<string>();
    const collectPaths = (nodes: GHFolderNode[]) => {
      for (const node of nodes) {
        allPaths.add(node.path);
        if (node.children) {
          collectPaths(node.children);
        }
      }
    };
    collectPaths(ghTree);
    setSelectedFolders(allPaths);
  };

  const clearAll = () => {
    setSelectedFolders(new Set());
  };

  const renderGHFolders = (items: GHFolderNode[], depth = 0): React.ReactNode[] =>
    items.map(folder => {
      const hasChildren = folder.children === undefined || folder.children.length > 0;
      const isExpanded = expandedFolders.has(folder.path);
      return (
        <div key={folder.path}>
          <FolderItem
            name={folder.name}
            path={folder.path}
            isSelected={selectedFolders.has(folder.path)}
            onToggle={toggleFolder}
            depth={depth}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            onExpandToggle={async () => {
              toggleExpand(folder.path);
              if (!folder.isLoaded) await loadChildren(folder);
            }}
          />
          {hasChildren && isExpanded && folder.children && (
            renderGHFolders(folder.children, depth + 1)
          )}
        </div>
      );
    });

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Zone name is required.");
      return;
    }

    if (selectedFolders.size === 0) {
      toast.error("At least one folder must be selected.");
      return;
    }

    setIsCrawling(true);
    const toastId = toast.loading("Fetching files from selected folders on GitHub...");

    try {
      const notes: Array<{ slug: string; title: string; content: string; tags: string[] }> = [];

      const fetchNotesFromFolder = async (folderPath: string) => {
        const res = await api.githubListTree(owner, repo, folderPath, branch, token || undefined);
        if (res.success) {
          for (const entry of res.entries) {
            if (entry.type === "dir") {
              await fetchNotesFromFolder(entry.path);
            } else if (entry.type === "file") {
              if (/\.(md|txt|json|markdown|html)$/i.test(entry.name)) {
                if (!notes.some((n) => n.slug === entry.path)) {
                  const fileRes = await api.githubGetFile(owner, repo, entry.path, branch, token || undefined);
                  if (fileRes.success) {
                    const tags = entry.path.split("/").slice(0, -1);
                    notes.push({
                      slug: entry.path,
                      title: entry.name,
                      content: fileRes.content || "",
                      tags,
                    });
                  }
                }
              }
            }
          }
        }
      };

      for (const folder of selectedFolders) {
        await fetchNotesFromFolder(folder);
      }

      if (notes.length === 0) {
        toast.error("No text/markdown files found in the selected folders.", { id: toastId });
        setIsCrawling(false);
        return;
      }

      toast.loading(`Creating zone with ${notes.length} notes...`, { id: toastId });

      const data: any = {
        name,
        description: description.trim() || undefined,
        ttlMinutes,
        accessType,
        allowedPaths: Array.from(selectedFolders),
        notes,
      };

      if (createNotebookLm) {
        data.createNotebookLM = true;
        data.notebookTitle = notebookLmTitle.trim() || undefined;
        data.notebookShareEmails = shareEmails.split(",").map((s) => s.trim()).filter(Boolean);
      }

      createZoneMutation.mutate(data, {
        onSuccess: (res) => {
          toast.dismiss(toastId);
          if (res.success) {
            // Success toast is handled in mutation onSuccess, but we need to reset/close here if needed
          }
        },
        onError: () => {
          toast.dismiss(toastId);
        }
      });
    } catch (err: any) {
      toast.error(`Failed to load files from GitHub: ${err.message}`, { id: toastId });
    } finally {
      setIsCrawling(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setTtlMinutes(1440);
    setAccessType("web");
    setCreateNotebookLm(false);
    setNotebookLmTitle("");
    setShareEmails("");
    setSelectedFolders(new Set());
    setExpandedFolders(new Set());
    setCreatedZone(null);
    setShowCreatedDialog(false);
    onClose();
  };

  const hasFolders = ghTree.length > 0;

  return (
    <>
      <Dialog open={isOpen && !showCreatedDialog} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Knowledge Zone</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>

            {/* Folder Tree Selection - Redesigned as Two Panel */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Folders *</Label>
              <div className="col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 border rounded-lg overflow-hidden bg-card/30 border-border/80">
                  {/* Left Panel: Tree Explorer */}
                  <div className="md:col-span-3 p-3 flex flex-col gap-2 min-h-[200px]">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-[11px] text-muted-foreground font-medium">Explorer</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={selectAll} className="h-5 px-1.5 text-[9px] uppercase tracking-wider font-mono">
                          All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearAll} className="h-5 px-1.5 text-[9px] uppercase tracking-wider font-mono">
                          Clear
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-44 bg-muted/5 rounded p-1">
                      {treeLoading ? (
                        <p className="text-xs text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                          <span className="animate-spin">⟳</span> Loading...
                        </p>
                      ) : !owner || !repo ? (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          No GitHub project configured. Select a project in the top-left corner.
                        </p>
                      ) : hasFolders ? (
                        renderGHFolders(ghTree)
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          No folders found in repository.
                        </p>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Right Panel: Selection Summary */}
                  <div className="md:col-span-2 p-3 bg-muted/10 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/50">
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Summary</h4>
                      <div className="space-y-2">
                        <div className="bg-background/50 border border-border/50 p-2 rounded flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Folders Selected</span>
                          <span className="text-lg font-bold font-mono tracking-tight text-[var(--accent-amber)]">
                            {selectedFolders.size}
                          </span>
                        </div>
                        <div className="bg-background/50 border border-border/50 p-2 rounded flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Repository</span>
                          <span className="text-sm font-bold font-mono tracking-tight text-foreground truncate">
                            {repo || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-muted-foreground leading-relaxed pt-3 border-t border-border/30">
                      Shared as a secure, temporary knowledge zone.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">TTL</Label>
              <div className="col-span-3 flex flex-wrap gap-1.5">
                {[{label:"15m",value:15},{label:"1h",value:60},{label:"6h",value:360},{label:"24h",value:1440},{label:"7d",value:10080}].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setTtlMinutes(opt.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${ttlMinutes === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"}`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accessType" className="text-right">
                Access Type
              </Label>
              <Select
                value={accessType}
                onValueChange={(value) => setAccessType(value as any)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="mcp">MCP</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="createNotebookLm" className="text-right">
                Create Archivist AI
              </Label>
              <Checkbox
                id="createNotebookLm"
                checked={createNotebookLm}
                onCheckedChange={(checked) => setCreateNotebookLm(!!checked)}
                className="col-span-3"
              />
            </div>
            {createNotebookLm && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notebookLmTitle" className="text-right">
                    Archivist Title
                  </Label>
                  <Input
                    id="notebookLmTitle"
                    value={notebookLmTitle}
                    onChange={(e) => setNotebookLmTitle(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="shareEmails" className="text-right">
                    Share Emails
                  </Label>
                  <Input
                    id="shareEmails"
                    value={shareEmails}
                    onChange={(e) => setShareEmails(e.target.value)}
                    className="col-span-3"
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={createZoneMutation.isPending || isCrawling}
            >
              {isCrawling ? "Fetching files..." : createZoneMutation.isPending ? "Creating..." : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ZoneCreatedDialog
        open={showCreatedDialog}
        zone={createdZone}
        onClose={handleClose}
      />
    </>
  );
}
