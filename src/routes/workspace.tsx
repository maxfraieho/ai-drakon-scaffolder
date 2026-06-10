import { createFileRoute, Navigate } from "@tanstack/react-router";
import { hasClientJwt } from "@/lib/route-auth";
import { WorkspacePage } from "@/pages/WorkspacePage";

export const Route = createFileRoute("/workspace")({
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  if (!hasClientJwt()) return <Navigate to="/login" replace />;
  return <WorkspacePage />;
}
