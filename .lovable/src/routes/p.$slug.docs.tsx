import { createFileRoute } from "@tanstack/react-router";
import { ProjectSectionPlaceholder } from "@/components/projects/ProjectSectionPlaceholder";

export const Route = createFileRoute("/p/$slug/docs")({
  component: ProjectDocsRoute,
});

function ProjectDocsRoute() {
  return (
    <ProjectSectionPlaceholder
      title="Docs"
      subtitle="Store architectural notes, runbooks, and technical context relevant to the project lifecycle."
      chips={["Knowledge base", "Runbooks", "References"]}
    />
  );
}
