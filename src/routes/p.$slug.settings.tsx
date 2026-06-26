import { createFileRoute } from "@tanstack/react-router";
import { ProjectSectionPlaceholder } from "@/components/projects/ProjectSectionPlaceholder";

export const Route = createFileRoute("/p/$slug/settings")({
  component: ProjectSettingsRoute,
});

function ProjectSettingsRoute() {
  return (
    <ProjectSectionPlaceholder
      title="Settings"
      subtitle="Configure repository bindings, environment preferences, integrations, and project-level defaults."
      chips={["Repository", "Integrations", "Environment"]}
    />
  );
}
