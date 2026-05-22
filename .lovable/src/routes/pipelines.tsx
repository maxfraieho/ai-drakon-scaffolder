import { createFileRoute, Navigate } from "@tanstack/react-router";
import { hasClientJwt } from "@/lib/route-auth";
import { PipelineCommandCenter } from "@/components/pipelines/PipelineCommandCenter";

export const Route = createFileRoute("/pipelines")({
  component: PipelinesRoute,
});

function PipelinesRoute() {
  if (!hasClientJwt()) return <Navigate to="/login" replace />;
  return <PipelineCommandCenter />;
}
