import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/index/")({
  component: IndexAliasRoute,
});

function IndexAliasRoute() {
  return <Navigate to="/diagrams" replace />;
}