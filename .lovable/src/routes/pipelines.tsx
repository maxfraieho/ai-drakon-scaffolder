import { createFileRoute } from "@tanstack/react-router";
import { PipelinesPage } from "@/components/pipelines/PipelinesPage";

export const Route = createFileRoute("/pipelines")({
  component: PipelinesPage,
});
