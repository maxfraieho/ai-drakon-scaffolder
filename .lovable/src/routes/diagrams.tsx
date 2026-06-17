import { createFileRoute, Navigate } from "@tanstack/react-router";
import { DiagramsPage } from "@/pages/DiagramsPage";
import { useRequireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/diagrams")({
  component: DiagramsRoute,
});

function DiagramsRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <DiagramsPage />;
}

