import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ArchitectPage } from "@/pages/ArchitectPage";
import { useRequireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/architect")({
  component: ArchitectRoute,
});

function ArchitectRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <ArchitectPage />;
}

