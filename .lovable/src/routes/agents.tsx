import { createFileRoute } from "@tanstack/react-router";
import AgentStudioPage from "@/pages/AgentStudioPage";

export const Route = createFileRoute("/agents")({
  component: AgentStudioPage,
});
