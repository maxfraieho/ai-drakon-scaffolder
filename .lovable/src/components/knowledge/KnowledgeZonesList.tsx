import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { BookOpen, Brain, Trash2, Copy, Folder } from "lucide-react";

import { api, type KnowledgeZone } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function KnowledgeZonesList() {
  const queryClient = useQueryClient();

  const {
    data: zones,
    isLoading,
    isError,
    error,
  } = useQuery<KnowledgeZone[]>({
    queryKey: ["knowledgeZones"],
    queryFn: async () => {
      const response = await api.listKnowledgeZones();
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch knowledge zones");
      }
      return response.zones;
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => api.deleteKnowledgeZone(zoneId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Knowledge zone deleted successfully.");
        queryClient.invalidateQueries({ queryKey: ["knowledgeZones"] });
      } else {
        toast.error(response.message || "Failed to delete knowledge zone.");
      }
    },
    onError: (err) => {
      toast.error(`Error deleting knowledge zone: ${err.message}`);
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500">Error: {error?.message}</div>;
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No knowledge zones found. Create one to get started!
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {zones.map((zone) => (
        <Card key={zone.id} className="flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{zone.name}</CardTitle>
              <div className="flex items-center gap-2">
                {zone.accessType === "web" && (
                  <BookOpen className="h-4 w-4 text-muted-foreground" title="Web Access" />
                )}
                {zone.accessType === "mcp" && (
                  <Brain className="h-4 w-4 text-muted-foreground" title="MCP Access" />
                )}
                {zone.accessType === "both" && (
                  <>
                    <BookOpen className="h-4 w-4 text-muted-foreground" title="Web Access" />
                    <Brain className="h-4 w-4 text-muted-foreground" title="MCP Access" />
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{zone.description || "No description."}</p>
              
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {zone.expiresAt && (
                  <span className="text-muted-foreground">
                    Expires {formatDistanceToNow(parseISO(zone.expiresAt), { addSuffix: true })}
                  </span>
                )}
                <Badge variant="outline">Notes: {zone.noteCount}</Badge>
                {zone.notebookLmStatus && (
                  <Badge
                    variant={
                      zone.notebookLmStatus === "completed"
                        ? "default"
                        : zone.notebookLmStatus === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    NLM: {zone.notebookLmStatus}
                  </Badge>
                )}
              </div>

              {/* Folders List */}
              {zone.folders && zone.folders.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Folders</p>
                  <div className="flex flex-wrap gap-1">
                    {zone.folders.map((folder, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0.5 flex items-center gap-1 font-mono">
                        <Folder className="w-3 h-3 text-muted-foreground" />
                        {folder.split("/").pop()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Credentials Copy Buttons */}
              {(zone.accessCode || zone.webUrl || zone.mcpUrl) && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Credentials</p>
                  <div className="flex flex-wrap gap-1.5">
                    {zone.accessCode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] flex items-center gap-1"
                        onClick={() => copyToClipboard(zone.accessCode!, "Access Code")}
                      >
                        <Copy className="w-3 h-3" />
                        Code
                      </Button>
                    )}
                    {zone.webUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] flex items-center gap-1"
                        onClick={() => copyToClipboard(zone.webUrl!, "Web URL")}
                      >
                        <Copy className="w-3 h-3" />
                        Web URL
                      </Button>
                    )}
                    {zone.mcpUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] flex items-center gap-1"
                        onClick={() => copyToClipboard(zone.mcpUrl!, "MCP URL")}
                      >
                        <Copy className="w-3 h-3" />
                        MCP URL
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </div>
          <CardContent className="pt-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteZoneMutation.mutate(zone.id)}
              disabled={deleteZoneMutation.isPending}
              className="mt-2 w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
