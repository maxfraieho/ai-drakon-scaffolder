import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/p/$slug/agents/$agentId/studio")({
  component: ProjectAgentStudioRoute,
});

function ProjectAgentStudioRoute() {
  const { slug, agentId } = Route.useParams();
  return <h1 id="test-studio-h1">HELLO STUDIO {slug} {agentId}</h1>;
}
