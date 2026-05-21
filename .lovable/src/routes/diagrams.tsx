import { createFileRoute, Navigate } from "@tanstack/react-router";

import { DiagramsPage } from "@/pages/DiagramsPage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/diagrams")({
component: DiagramsRoute,
});

function DiagramsRoute() {
if (!hasClientJwt()) {
return <Navigate to="/login" replace />;
}
return <DiagramsPage />;
}

