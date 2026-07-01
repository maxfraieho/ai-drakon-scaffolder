import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ProjectsPage } from "@/pages/ProjectsPage";
import LandingPage from "@/pages/LandingPage";
import { hasClientJwt } from "@/lib/route-auth";
import { useAuth } from "@/context/AuthContext";
import { PageSkeleton } from "@/components/app/PageSkeleton";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [hydrated, setHydrated] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => setHydrated(true), []);

  if (!hydrated || isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated && !hasClientJwt()) {
    return <LandingPage />;
  }

  return <ProjectsPage />;
}
