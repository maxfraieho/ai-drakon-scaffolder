import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { GardenPage } from "@/pages/GardenPage";
import { hasClientJwt } from "@/lib/route-auth";
import { useProject } from "@/context/ProjectContext";

export const Route = createFileRoute("/docs")({
  component: DocsRoute,
});

function DocsRoute() {
  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <DocsContent />;
}

function DocsContent() {
  const { loading } = useProject();
  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
    </div>
  );
  return <GardenPage />;
}
