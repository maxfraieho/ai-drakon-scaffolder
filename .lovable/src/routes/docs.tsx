import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { hasClientJwt } from "@/lib/route-auth";
import { GardenPage } from "@/pages/GardenPage";
import { GitHubDocsPage } from "@/pages/GitHubDocsPage";
import { useProject } from "@/context/ProjectContext";

export const Route = createFileRoute("/docs")({
  component: DocsRoute,
});

function DocsRoute() {
  if (!hasClientJwt()) return <Navigate to="/login" replace />;
  return <DocsSwitch />;
}

function DocsSwitch() {
  const { activeProject, loading } = useProject();
  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
    </div>
  );
  if (activeProject?.github) return <GitHubDocsPage />;
  return <GardenPage />;
}
