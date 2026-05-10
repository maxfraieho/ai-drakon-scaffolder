import { Navigate, createFileRoute } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";

export const Route = createFileRoute("/diagram/editor")({
  component: DiagramEditorRoute,
});

function DiagramEditorRoute() {
  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return <Navigate to="/login" replace />;
  }

  return <DiagramEditorPage />;
}
