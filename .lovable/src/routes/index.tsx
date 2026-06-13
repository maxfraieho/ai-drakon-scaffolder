import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HomePage } from "@/pages/HomePage";
import LandingPage from "@/pages/LandingPage";
import { hasClientJwt } from "@/lib/route-auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;

  if (!hasClientJwt()) {
    return <LandingPage />;
  }
  return <HomePage />;
}
