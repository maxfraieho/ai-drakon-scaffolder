import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DiagramsPage } from "@/pages/DiagramsPage";
import { useRequireAuth } from "@/lib/route-auth";
import { account } from "@/lib/appwrite";
import { setAccessToken } from "@/lib/auth";
import { readSettings, writeSettings } from "@/lib/settings-storage";

export const Route = createFileRoute("/diagrams")({
  component: DiagramsRoute,
});

function DiagramsRoute() {
  const [handlingOAuth, setHandlingOAuth] = useState(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    return !!(p.get("userId") && p.get("secret"));
  });

  useEffect(() => {
    if (!handlingOAuth) return;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const secret = params.get("secret");
    if (!userId || !secret) { setHandlingOAuth(false); return; }

    account
      .createSession(userId, secret)
      .then(async (session) => {
        // GitHub OAuth login — save provider token so repos load without PAT
        if (session.provider === "github" && session.providerAccessToken) {
          try {
            const s = readSettings();
            writeSettings({ ...s, github: { ...s.github, token: session.providerAccessToken } });
          } catch (_) {}
        }
        try {
          const jwtObj = await account.createJWT();
          setAccessToken(jwtObj.jwt);
        } catch (_) {}
        window.location.replace("/diagrams");
      })
      .catch(() => {
        window.location.replace("/login");
      });
  }, []);

  const { loading, allowed } = useRequireAuth();
  if (handlingOAuth || loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <DiagramsPage />;
}
