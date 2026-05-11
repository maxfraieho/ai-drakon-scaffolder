import { useEffect, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";

import DiagramEditorPage from "@/pages/DiagramEditorPage";

export const Route = createFileRoute("/diagram/editor")({
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
