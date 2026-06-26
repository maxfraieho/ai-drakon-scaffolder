import { createFileRoute } from "@tanstack/react-router";

import AgentStudioPage from "@/pages/AgentStudioPage";

export const Route = createFileRoute("/p/$slug/agents/$agentId/studio")({
  component: ProjectAgentStudioRoute,
});

function ProjectAgentStudioRoute() {
  const { slug, agentId } = Route.useParams();
  return <AgentStudioPage key={`${slug}:${agentId}`} />;
}