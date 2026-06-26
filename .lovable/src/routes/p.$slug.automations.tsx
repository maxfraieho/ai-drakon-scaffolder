import { createFileRoute } from "@tanstack/react-router";
import { ProjectSectionPlaceholder } from "@/components/projects/ProjectSectionPlaceholder";

export const Route = createFileRoute("/p/$slug/automations")({
  component: ProjectAutomationsRoute,
});

function ProjectAutomationsRoute() {
  return (
    <ProjectSectionPlaceholder
      title="Automations"
      subtitle="Design workflow automations, trigger rules, and execution chains for N8N-style integrations."
      chips={["Triggers", "Workflow runs", "External actions"]}
    />
  );
}
