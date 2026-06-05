import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Folder,
  BookOpen,
  Brain,
  Trash2,
  Clock,
  FileText
} from "lucide-react";
import type { KnowledgeZone } from "@/lib/api";

interface ZoneDetailSheetProps {
  zone: KnowledgeZone | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function getExpiryClass(expiresAt?: number | string): string {
  if (!expiresAt) return "text-muted-foreground";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return "text-red-500 font-semibold";
  if (diff < 3_600_000) return "text-red-500 font-semibold";
  if (diff < 86_400_000) return "text-yellow-500 font-semibold";
  return "text-emerald-500 font-semibold";
}

export function ZoneDetailSheet({ zone, open, onClose, onDelete }: ZoneDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!zone) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const formattedExpiryDate = zone.expiresAt
    ? new Date(zone.expiresAt).toLocaleString()
    : "Never";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto bg-background border-l border-border flex flex-col justify-between p-6">
        <div className="space-y-6">
          <SheetHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-4">
              <SheetTitle className="text-xl font-bold font-mono tracking-tight text-foreground truncate max-w-[280px]">
                {zone.name}
              </SheetTitle>
              <div className="flex gap-1.5 items-center">
                {(zone.accessType === "web" || zone.accessType === "both") && (
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1 py-0.5 px-2 bg-muted/20 border-border/60">
                    <BookOpen className="w-3 h-3 text-muted-foreground" /> Web
                  </Badge>
                )}
                {(zone.accessType === "mcp" || zone.accessType === "both") && (
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1 py-0.5 px-2 bg-muted/20 border-border/60">
                    <Brain className="w-3 h-3 text-muted-foreground" /> MCP
                  </Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          {zone.description && (
            <div className="bg-muted/10 p-3 rounded-lg border border-border/40 text-sm text-muted-foreground leading-relaxed">
              {zone.description}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/5 border border-border/30 p-3 rounded-lg flex flex-col justify-center gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Note Count</span>
              <span className="text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {zone.noteCount ?? 0}
              </span>
            </div>
            <div className="bg-muted/5 border border-border/30 p-3 rounded-lg flex flex-col justify-center gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Shared Folders</span>
              <span className="text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-muted-foreground" />
                {zone.folders?.length ?? 0}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Expiration:</span>
              {zone.expiresAt ? (
                <span className={getExpiryClass(zone.expiresAt)}>
                  {formatDistanceToNow(new Date(zone.expiresAt), { addSuffix: true })}
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">Never expires</span>
              )}
            </div>
            {zone.expiresAt && (
              <p className="text-[11px] text-muted-foreground pl-6">
                Exact time: {formattedExpiryDate}
              </p>
            )}
          </div>

          {zone.folders && zone.folders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Shared Paths</h4>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-muted/5 rounded-md border border-border/20">
                {zone.folders.map((folder, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[11px] px-2 py-0.5 font-mono flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-zinc-400">
                    <Folder className="w-3 h-3 text-muted-foreground/70" />
                    {folder.split("/").pop()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-border/60" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Access Credentials</h4>
              {zone.notebookLmStatus && zone.notebookLmStatus !== "none" && (
                <Badge
                  variant={zone.notebookLmStatus === "completed" ? "default" : zone.notebookLmStatus === "failed" ? "destructive" : "secondary"}
                  className="text-[10px] h-5"
                >
                  NLM: {zone.notebookLmStatus}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {zone.accessCode && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Access Code</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={zone.accessCode}
                      className="font-mono text-xs bg-muted/30 border-border select-all h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(zone.accessCode!, "Access Code")}
                      className="h-9 w-9 px-0 shrink-0"
                    >
                      {copiedField === "Access Code" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {zone.accessType !== "mcp" && zone.webUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Web URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={zone.webUrl}
                      className="font-mono text-xs bg-muted/30 border-border select-all h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(zone.webUrl!, "Web URL")}
                      className="h-9 w-9 px-0 shrink-0"
                    >
                      {copiedField === "Web URL" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <a
                      href={zone.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 px-0 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {zone.accessType !== "web" && zone.mcpUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">MCP Server URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={zone.mcpUrl}
                      className="font-mono text-xs bg-muted/30 border-border select-all h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(zone.mcpUrl!, "MCP URL")}
                      className="h-9 w-9 px-0 shrink-0"
                    >
                      {copiedField === "MCP URL" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border/40 mt-8 space-y-3">
          <div className="space-y-1 pb-1">
            <h4 className="text-xs uppercase font-bold text-red-500/80 tracking-wider">Danger Zone</h4>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Deleting this zone will immediately invalidate all access codes, URLs, and shared folders.
            </p>
          </div>
          <Button
            variant="destructive"
            className="w-full flex items-center justify-center gap-2 h-10 font-semibold"
            onClick={() => onDelete(zone.id)}
          >
            <Trash2 className="w-4 h-4" />
            Delete Knowledge Zone
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
