import { createFileRoute } from "@tanstack/react-router";
import { ProjectSectionPlaceholder } from "@/components/projects/ProjectSectionPlaceholder";

export const Route = createFileRoute("/p/$slug/agents")({
  component: ProjectAgentsRoute,
});

function ProjectAgentsRoute() {
  return (
    <ProjectSectionPlaceholder
      title="Agents"
      subtitle="Manage agent definitions, responsibilities, prompts, and execution settings for this project."
      chips={["Agent catalog", "Prompt tuning", "Run health"]}
    />
  );
}
