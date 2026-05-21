import { createFileRoute, Navigate } from "@tanstack/react-router";

import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/diagrams" replace />;
}
