import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/pages/AgentsPage";

export const Route = createFileRoute("/p/$slug/agents")({
  component: ProjectAgentsRoute,
});

function ProjectAgentsRoute() {
  const { slug } = Route.useParams();
  return <AgentsPage slug={slug} />;
}
