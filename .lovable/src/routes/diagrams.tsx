import { createFileRoute } from "@tanstack/react-router";

import { DiagramsPage } from "@/pages/DiagramsPage";

export const Route = createFileRoute("/diagrams")({
  component: DiagramsRoute,
});

function DiagramsRoute() {
  return <DiagramsPage />;
}
