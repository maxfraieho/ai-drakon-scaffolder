import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Brain, Folder, PlusCircle } from "lucide-react";
import { useState } from "react";

import { api, type KnowledgeZone } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoneDetailSheet } from "./ZoneDetailSheet";

function getExpiryClass(expiresAt?: number | string): string {
  if (!expiresAt) return "text-muted-foreground";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return "text-destructive font-medium";
  if (diff < 3_600_000) return "text-destructive";
  if (diff < 86_400_000) return "text-yellow-500";
  return "text-emerald-500";
}

export function KnowledgeZonesList() {
  const queryClient = useQueryClient();
  const [selectedZone, setSelectedZone] = useState<KnowledgeZone | null>(null);

  const { data: zones, isLoading, isError, error } = useQuery<KnowledgeZone[]>({
    queryKey: ["knowledgeZones"],
    queryFn: async () => {
      const response = await api.listKnowledgeZones();
      if (!response.success) throw new Error(response.message || "Failed to fetch knowledge zones");
      return response.zones;
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => api.deleteKnowledgeZone(zoneId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Zone deleted.");
        queryClient.invalidateQueries({ queryKey: ["knowledgeZones"] });
      } else {
        toast.error(response.message || "Failed to delete zone.");
      }
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-6 w-1/3 mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive text-sm p-4 rounded-md border border-destructive/30 bg-destructive/5">
        Error: {error?.message}
      </div>
    );
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <PlusCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm">No active knowledge zones. Create one to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <Card
            key={zone.id}
            className="flex flex-col border-border/60 hover:border-border transition-colors cursor-pointer"
            onClick={() => setSelectedZone(zone)}
          >
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-sm font-mono font-semibold leading-tight truncate max-w-[200px]">
                {zone.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                {(zone.accessType === "web" || zone.accessType === "both") && (
                  <span title="Web Access">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                )}
                {(zone.accessType === "mcp" || zone.accessType === "both") && (
                  <span title="MCP Access">
                    <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
              {zone.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{zone.description}</p>
              )}

              {/* Expiry + note count */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {zone.expiresAt && (
                  <span className={getExpiryClass(zone.expiresAt)}>
                    ⏱ {formatDistanceToNow(new Date(zone.expiresAt), { addSuffix: true })}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] h-5">
                  {zone.noteCount ?? 0} notes
                </Badge>
                {zone.notebookLmStatus && zone.notebookLmStatus !== "none" && (
                  <Badge
                    variant={zone.notebookLmStatus === "completed" ? "default" : zone.notebookLmStatus === "failed" ? "destructive" : "secondary"}
                    className="text-[10px] h-5"
                  >
                    NLM: {zone.notebookLmStatus}
                  </Badge>
                )}
              </div>

              {/* Folders */}
              {zone.folders && zone.folders.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {zone.folders.map((folder, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-mono flex items-center gap-1">
                      <Folder className="w-2.5 h-2.5" />
                      {folder.split("/").pop()}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ZoneDetailSheet
        zone={selectedZone}
        open={!!selectedZone}
        onClose={() => setSelectedZone(null)}
        onDelete={(id) => {
          deleteZoneMutation.mutate(id);
          setSelectedZone(null);
        }}
      />
    </>
  );
}
