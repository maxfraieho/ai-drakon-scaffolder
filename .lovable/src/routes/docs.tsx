import { Navigate, createFileRoute } from "@tanstack/react-router";
import { GardenPage } from "@/pages/GardenPage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/docs")({
  component: DocsRoute,
});

function DocsRoute() {
  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <GardenPage />;
}
