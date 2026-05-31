import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DiagramsPage } from "@/pages/DiagramsPage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/diagrams")({
component: DiagramsRoute,
});

function DiagramsRoute() {
const [hydrated, setHydrated] = useState(false);
useEffect(() => setHydrated(true), []);
if (!hydrated) return null;
if (!hasClientJwt()) {
return <Navigate to="/login" replace />;
}
return <DiagramsPage />;
}

