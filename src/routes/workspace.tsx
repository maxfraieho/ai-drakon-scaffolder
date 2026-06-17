import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRequireAuth } from "@/lib/route-auth";
import { WorkspacePage } from "@/pages/WorkspacePage";

export const Route = createFileRoute("/workspace")({
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <WorkspacePage />;
}
