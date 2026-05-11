import { useEffect, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";

export const Route = createFileRoute("/diagram/editor")({
  validateSearch: (search: Record<string, unknown>): {
    diagramId?: string;
    folderId?: string;
    isNew?: string;
  } => {
    const result: { diagramId?: string; folderId?: string; isNew?: string } = {};
    if (typeof search.diagramId === "string") result.diagramId = search.diagramId;
    if (typeof search.folderId === "string") result.folderId = search.folderId;
    if (typeof search.isNew === "string") result.isNew = search.isNew;
    return result;
  },
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
