import { createFileRoute } from "@tanstack/react-router";
import { GardenPage } from "@/pages/GardenPage";

export const Route = createFileRoute("/p/$slug/docs")({
  component: ProjectDocsRoute,
});

function ProjectDocsRoute() {
  return (
    <div className="h-full min-h-[500px]">
      <GardenPage />
    </div>
  );
}
