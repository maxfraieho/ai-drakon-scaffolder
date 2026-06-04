import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { BookOpen, Brain, Trash2 } from "lucide-react";

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
        <Card key={zone.id}>
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
          <CardContent className="space-y-2">
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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteZoneMutation.mutate(zone.id)}
              disabled={deleteZoneMutation.isPending}
              className="mt-4"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
