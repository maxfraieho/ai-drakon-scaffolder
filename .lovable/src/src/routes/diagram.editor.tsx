import { createFileRoute, Navigate } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";
import { useRequireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/diagram/editor")({
  component: DiagramEditorRoute,
});

function DiagramEditorRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <DiagramEditorPage />;
}

