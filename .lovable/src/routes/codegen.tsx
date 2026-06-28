import { createFileRoute } from "@tanstack/react-router";
import { CodegenPage } from "@/pages/CodegenPage";

export const Route = createFileRoute("/codegen")({
  component: CodegenPage,
});
