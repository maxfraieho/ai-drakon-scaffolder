import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRequireAuth } from "@/lib/route-auth";
import { CodegenPage } from "@/pages/CodegenPage";

export const Route = createFileRoute("/codegen")({
  component: CodegenRoute,
});

function CodegenRoute() {
  const { loading, allowed } = useRequireAuth();
  if (loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <CodegenPage />;
}
