import { createFileRoute, Navigate } from "@tanstack/react-router";
import { hasClientJwt } from "@/lib/route-auth";
import { ProjectFileManager } from "@/components/files/ProjectFileManager";

export const Route = createFileRoute("/code")({
  component: CodeRoute,
});

function CodeRoute() {
  if (!hasClientJwt()) return <Navigate to="/login" replace />;
  return <ProjectFileManager defaultMode="code" />;
}
