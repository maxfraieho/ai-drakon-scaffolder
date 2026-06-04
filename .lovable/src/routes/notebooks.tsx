import { createFileRoute } from "@tanstack/react-router";
import { NotebookLMPage } from "@/pages/NotebookLMPage";

export const Route = createFileRoute("/notebooks")({
  component: NotebookLMPage,
});
