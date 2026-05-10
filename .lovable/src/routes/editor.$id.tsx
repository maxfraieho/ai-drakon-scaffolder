import { Navigate, createFileRoute } from "@tanstack/react-router";

import { EditorPage } from "@/pages/EditorPage";

export const Route = createFileRoute("/editor/$id")({
  component: EditorRoute,
});

function EditorRoute() {
  const { id } = Route.useParams();

  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return <Navigate to="/login" replace />;
  }

  return <EditorPage diagramId={id} />;
}
