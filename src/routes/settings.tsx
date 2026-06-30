import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/SettingsPage";

import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const [redirecting, setRedirecting] = useState(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    return p.get("connected") === "1";
  });

  useEffect(() => {
    if (!redirecting) return;
    const redirectBack = sessionStorage.getItem("oauth_redirect_back");
    if (redirectBack) {
      sessionStorage.removeItem("oauth_redirect_back");
      window.location.replace(redirectBack);
    } else {
      window.location.replace("/diagrams");
    }
  }, [redirecting]);

  if (redirecting) return null;
  return <SettingsPage />;
}
