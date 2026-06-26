import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/pages/AgentsPage";

export const Route = createFileRoute("/p/$slug/agents")({
  component: ProjectAgentsRoute,
});

function ProjectAgentsRoute() {
  return <AgentsPage />;
}
