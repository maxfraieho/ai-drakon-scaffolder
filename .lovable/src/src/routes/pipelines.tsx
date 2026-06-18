import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRequireAuth } from "@/lib/route-auth";
import { PipelineCommandCenter } from "@/components/pipelines/PipelineCommandCenter";

export const Route = createFileRoute("/pipelines")({
  component: PipelinesRoute,
});

function PipelinesRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <PipelineCommandCenter />;
}
