import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRequireAuth } from "@/lib/route-auth";
import { ProjectNewPage } from "@/pages/ProjectNewPage";

export const Route = createFileRoute("/project/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    template: search.template as string | undefined,
  }),
  component: ProjectNewRoute,
});

function ProjectNewRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <ProjectNewPage />;
}
