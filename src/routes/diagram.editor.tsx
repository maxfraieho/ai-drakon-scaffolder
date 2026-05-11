import { useEffect, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";

export const Route = createFileRoute("/diagram/editor")({
  validateSearch: (search: Record<string, unknown>) => ({
    diagramId: typeof search.diagramId === "string" ? search.diagramId : undefined,
    folderId: typeof search.folderId === "string" ? search.folderId : undefined,
    isNew: typeof search.isNew === "string" ? search.isNew : undefined,
  }),
  component: DiagramEditorRoute,
});

function DiagramEditorRoute() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!localStorage.getItem("jwt")) {
    return <Navigate to="/login" replace />;
  }

  return <DiagramEditorPage />;
}
