import { createFileRoute, Navigate } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/diagram/editor")({
  component: DiagramEditorRoute,
});

function DiagramEditorRoute() {
  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <DiagramEditorPage />;
}
