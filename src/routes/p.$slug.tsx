import { Outlet, createFileRoute, useParams } from "@tanstack/react-router";
import { ProjectLayout } from "@/layouts/ProjectLayout";

export const Route = createFileRoute("/p/$slug")({
  component: ProjectHubLayoutRoute,
});

function ProjectHubLayoutRoute() {
  const { slug } = useParams({ from: "/p/$slug" });

  return (
    <ProjectLayout slug={slug}>
      <Outlet />
    </ProjectLayout>
  );
}
