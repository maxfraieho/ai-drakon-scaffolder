import { createFileRoute } from "@tanstack/react-router";
import PipelinesPage from "@/pages/PipelineEditorPage";

export const Route = createFileRoute("/pipelines")({
  component: PipelinesPage,
});
