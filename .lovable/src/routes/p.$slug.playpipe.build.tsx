import { createFileRoute } from "@tanstack/react-router";

import { PlayPipeBuildPage } from "@/pages/PlayPipeBuildPage";

export const Route = createFileRoute("/p/$slug/playpipe/build")({
  component: ProjectPlayPipeBuildRoute,
});

function ProjectPlayPipeBuildRoute() {
  return <PlayPipeBuildPage />;
}