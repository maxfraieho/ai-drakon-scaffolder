import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DiagramsPage } from "@/pages/DiagramsPage";
import { useRequireAuth } from "@/lib/route-auth";
import { account, databases } from "@/lib/appwrite";
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
    if (!userId || !secret) {
      setHandlingOAuth(false);
      return;
    }

    account
      .createSession(userId, secret)
      .then(async (session) => {
        if (session.provider === "github" && session.providerAccessToken) {
          const token = session.providerAccessToken;
          try {
            const s = readSettings();
            writeSettings({ ...s, github: { ...s.github, token } });
          } catch {}

          try {
            const ghResp = await fetch("https://api.github.com/user", {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
            });
            const ghUser = ghResp.ok ? await ghResp.json() : {};
            const profileData = { githubToken: token, githubLogin: ghUser.login || "" };
            try {
              await databases.createDocument("ai-drakon", "user_profiles", userId, profileData);
            } catch {
              try {
                await databases.updateDocument("ai-drakon", "user_profiles", userId, profileData);
              } catch {}
            }
          } catch {}
        }

        try {
          const jwtObj = await account.createJWT();
          setAccessToken(jwtObj.jwt);
        } catch {}

        window.location.replace("/diagrams");
      })
      .catch(() => {
        window.location.replace("/login");
      });
  }, [handlingOAuth]);

  const { loading, allowed } = useRequireAuth();
  if (handlingOAuth || loading) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return <DiagramsPage />;
}
