import { createFileRoute } from "@tanstack/react-router";
import { PlayPipePage } from "@/pages/PlayPipePage";

export const Route = createFileRoute("/p/$slug/playpipe")({
  component: ProjectPlayPipeRoute,
});

function ProjectPlayPipeRoute() {
  return <PlayPipePage />;
}
