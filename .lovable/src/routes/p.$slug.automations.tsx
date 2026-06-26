import { createFileRoute } from "@tanstack/react-router";
import { N8NAutomationsPage } from "@/pages/N8NAutomationsPage";

export const Route = createFileRoute("/p/$slug/automations")({
  component: ProjectAutomationsRoute,
});

function ProjectAutomationsRoute() {
  return <N8NAutomationsPage />;
}
