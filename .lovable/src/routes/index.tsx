import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HomePage } from "@/pages/HomePage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;

  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <HomePage />;
}
