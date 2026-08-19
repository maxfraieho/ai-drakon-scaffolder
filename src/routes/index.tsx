import { createFileRoute } from "@tanstack/react-router";

import { ProjectsPage } from "@/pages/ProjectsPage";
import LandingPage from "@/pages/LandingPage";
import { hasClientJwt, useHydrated } from "@/lib/route-auth";
import { useAuth } from "@/context/AuthContext";
import { PageSkeleton } from "@/components/app/PageSkeleton";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const hydrated = useHydrated();
  const { isAuthenticated, isLoading } = useAuth();

  if (!hydrated || isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated && !hasClientJwt()) {
    return <LandingPage />;
  }

  return <ProjectsPage />;
}
