import { createFileRoute, Navigate } from "@tanstack/react-router";
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
  const { activeProject } = useProject();
  if (activeProject?.github) return <GitHubDocsPage />;
  return <GardenPage />;
}
