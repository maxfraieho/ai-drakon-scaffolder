import { createFileRoute } from "@tanstack/react-router";
import { ProjectSectionPlaceholder } from "@/components/projects/ProjectSectionPlaceholder";

export const Route = createFileRoute("/p/$slug/playpipe")({
  component: ProjectPlayPipeRoute,
});

function ProjectPlayPipeRoute() {
  return (
    <ProjectSectionPlaceholder
      title="PlayPipe"
      subtitle="Assemble application flows from component agents, route signals, and reusable pipeline blocks."
      chips={["Component graph", "Flow orchestration", "Output contracts"]}
    />
  );
}
