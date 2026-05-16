import { createFileRoute } from "@tanstack/react-router";
import PipelineEditorPage from "@/pages/PipelineEditorPage";

export const Route = createFileRoute("/pipeline-editor")({
  component: PipelineEditorPage,
});
