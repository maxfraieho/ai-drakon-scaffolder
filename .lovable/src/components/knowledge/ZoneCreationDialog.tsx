import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchNotesTree, fetchNote, type TreeNode } from "@/lib/garden/notesApi";
import { ZoneCreatedDialog } from "./ZoneCreatedDialog";
import { cn } from "@/lib/utils";

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

const countNotesInFolders = (
  nodes: TreeNode[],
  selectedPaths: Set<string>,
  parentIsSelected = false
): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "note") {
      if (parentIsSelected) {
        count++;
      }
    } else if (node.type === "folder") {
      const isCurrentSelected = selectedPaths.has(node.path) || parentIsSelected;
      if (node.children) {
        count += countNotesInFolders(node.children, selectedPaths, isCurrentSelected);
      }
    }
  }
  return count;
};

interface ZoneCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZoneCreationDialog({
  isOpen,
  onClose,
}: ZoneCreationDialogProps) {
  const queryClient = useQueryClient();

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

  const { data: notesTree = [] } = useQuery({
    queryKey: ["notesTree"],
    queryFn: () => fetchNotesTree(),
    enabled: isOpen,
  });

  const noteCount = useMemo(() => {
    return countNotesInFolders(notesTree, selectedFolders);
  }, [notesTree, selectedFolders]);

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
    const collectPaths = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "folder") {
          allPaths.add(node.path);
          if (node.children) {
            collectPaths(node.children);
          }
        }
      }
    };
    collectPaths(notesTree);
    setSelectedFolders(allPaths);
  };

  const clearAll = () => {
    setSelectedFolders(new Set());
  };

  const renderFolders = (items: TreeNode[], depth = 0): React.ReactNode[] => {
    return items
      .filter((node) => node.type === "folder")
      .map((folder) => {
        const folderChildren = folder.children ?? [];
        const hasSubfolders = folderChildren.some((child) => child.type === "folder");
        const isExpanded = expandedFolders.has(folder.path);
        return (
          <div key={folder.path}>
            <FolderItem
              name={folder.name || folder.path.split("/").pop() || ""}
              path={folder.path}
              isSelected={selectedFolders.has(folder.path)}
              onToggle={toggleFolder}
              depth={depth}
              hasChildren={hasSubfolders}
              isExpanded={isExpanded}
              onExpandToggle={() => toggleExpand(folder.path)}
            />
            {hasSubfolders && isExpanded && (
              renderFolders(folderChildren, depth + 1)
            )}
          </div>
        );
      });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Zone name is required.");
      return;
    }

    if (selectedFolders.size === 0) {
      toast.error("At least one folder must be selected.");
      return;
    }

    const data: CreateKnowledgeZoneRequest = {
      name,
      description: description.trim() || undefined,
      ttlMinutes,
      accessType,
      createNotebookLm,
      folders: Array.from(selectedFolders),
      noteCount,
    };

    if (createNotebookLm) {
      data.notebookLmTitle = notebookLmTitle.trim() || undefined;
      data.shareEmails = shareEmails.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Fetch note content for selected folders
    const fetchAndSubmit = async () => {
      const treeData = notesTree;
      const noteNodes: TreeNode[] = [];
      const walk = (nodes: TreeNode[]) => {
        for (const n of nodes) {
          if (n.type === "note" && n.slug) {
            const parts = n.slug.split("/");
            const folder = parts.slice(0, -1).join("/");
            if (selectedFolders.size === 0 || selectedFolders.has(folder) || selectedFolders.has(parts[0])) {
              noteNodes.push(n);
            }
          }
          if (n.children) walk(n.children);
        }
      };
      walk(treeData);
      const notes = await Promise.all(noteNodes.map(async (n) => {
        try {
          const nc = await fetchNote(n.slug!);
          return { slug: n.slug!, title: n.title ?? n.slug!, content: nc?.content ?? "", tags: nc?.tags ?? [] };
        } catch { return { slug: n.slug!, title: n.title ?? n.slug!, content: "", tags: [] }; }
      }));
      data.noteCount = notes.length;
      (data as any).notes = notes;
      createZoneMutation.mutate(data);
    };
    void fetchAndSubmit();
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

  const hasFolders = notesTree.some((node) => node.type === "folder");

  return (
    <>
      <Dialog open={isOpen && !showCreatedDialog} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
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

            {/* Folder Tree Selection */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Folders *</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Select folders to share</span>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-1.5 text-[10px]">
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-1.5 text-[10px]">
                      Clear All
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-48 border rounded-md bg-muted/10">
                  <div className="p-1">
                    {hasFolders ? (
                      renderFolders(notesTree)
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No folders found in vault.
                      </p>
                    )}
                  </div>
                </ScrollArea>
                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span>📁 {selectedFolders.size} folders selected</span>
                  <span>📝 {noteCount} notes</span>
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
                Create NotebookLM
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
                    NotebookLM Title
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
              disabled={createZoneMutation.isPending}
            >
              {createZoneMutation.isPending ? "Creating..." : "Create Zone"}
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
