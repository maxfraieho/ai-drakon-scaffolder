import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AgentsPage } from "@/pages/AgentsPage";
import { useRequireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/agents")({
  component: AgentsRoute,
});

function AgentsRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <AgentsPage />;
}

