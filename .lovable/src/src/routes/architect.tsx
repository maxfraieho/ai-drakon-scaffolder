import { createFileRoute } from "@tanstack/react-router";
import { ArchitectPage } from "@/pages/ArchitectPage";

export const Route = createFileRoute("/architect")({
  component: ArchitectPage,
});
