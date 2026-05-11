import { createFileRoute } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";

export const Route = createFileRoute("/diagram/editor")({
  component: DiagramEditorRoute,
});

function DiagramEditorRoute() {
  return <DiagramEditorPage />;
}
