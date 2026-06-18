import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRequireAuth } from "@/lib/route-auth";
import { ProjectFileManager } from "@/components/files/ProjectFileManager";

export const Route = createFileRoute("/code")({
  component: CodeRoute,
});

function CodeRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <ProjectFileManager defaultMode="code" />;
}
