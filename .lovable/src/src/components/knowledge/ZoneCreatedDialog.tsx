import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Calendar } from "lucide-react";
import { useState } from "react";
import type { KnowledgeZone } from "@/lib/api";

interface ZoneCreatedDialogProps {
  open: boolean;
  zone: KnowledgeZone | null;
  onClose: () => void;
}

export function ZoneCreatedDialog({ open, zone, onClose }: ZoneCreatedDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!zone) return null;

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Failed to copy text");
    }
  };

  const formattedExpiry = zone.expiresAt
    ? new Date(zone.expiresAt).toLocaleString()
    : "Never";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-background border border-border shadow-lg rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-emerald-500 flex items-center gap-2">
            <span>Zone Created</span>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">✓</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1 bg-muted/30 p-3 rounded-lg border border-muted">
            <h4 className="font-semibold text-sm text-foreground">{zone.name}</h4>
            {zone.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{zone.description}</p>
            )}
          </div>

          <div className="space-y-3">
            {zone.accessCode && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">Access Code</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={zone.accessCode}
                    className="font-mono text-xs bg-muted/50 border-border select-all"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(zone.accessCode!, "Access Code")}
                    className="flex-shrink-0"
                  >
                    {copiedField === "Access Code" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {zone.webUrl && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">Web Client URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={zone.webUrl}
                    className="font-mono text-xs bg-muted/50 border-border select-all"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(zone.webUrl!, "Web URL")}
                    className="flex-shrink-0"
                  >
                    {copiedField === "Web URL" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  {typeof window !== "undefined" && (
                    <a
                      href={zone.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {zone.mcpUrl && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">MCP Endpoint URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={zone.mcpUrl}
                    className="font-mono text-xs bg-muted/50 border-border select-all"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(zone.mcpUrl!, "MCP URL")}
                    className="flex-shrink-0"
                  >
                    {copiedField === "MCP URL" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border border-dashed border-border mt-2">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Expires on: <strong className="text-foreground">{formattedExpiry}</strong></span>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
