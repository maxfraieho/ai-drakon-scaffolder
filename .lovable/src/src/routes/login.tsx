import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { hasClientJwt } from "@/lib/route-auth";
import { LoginPage } from "@/pages/LoginPage";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
component: LoginRoute,
});

function LoginRoute() {
  const [hydrated, setHydrated] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => setHydrated(true), []);
  if (!hydrated || isLoading) return null;
  if (isAuthenticated || hasClientJwt()) {
    return <Navigate to="/diagrams" replace />;
  }

  return <LoginPage />;
}

