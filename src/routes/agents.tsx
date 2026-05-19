import { createFileRoute, Navigate } from "@tanstack/react-router";
import AgentStudioPage from "@/pages/AgentStudioPage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/agents")({
  component: AgentsRoute,
});

function AgentsRoute() {
  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <AgentStudioPage />;
}
