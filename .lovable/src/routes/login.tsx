import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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

  // Show spinner while auth is loading to prevent flash of empty page
  if (!hydrated || isLoading) {
    return (
      <div className="astryx-migrated flex min-h-screen items-center justify-center bg-[var(--astryx-surface-page)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--astryx-color-brand)]" />
      </div>
    );
  }

  if (isAuthenticated || hasClientJwt()) {
    return <Navigate to="/diagrams" replace />;
  }

  return <LoginPage />;
}
