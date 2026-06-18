import { getAccessToken } from "@/lib/auth";

export function hasClientJwt(): boolean {
  return Boolean(getAccessToken());
}

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function useRequireAuth(): { loading: boolean; allowed: boolean } {
  const { isAuthenticated, isLoading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Accept EITHER an Appwrite session (isAuthenticated) OR a client-side JWT /
  // bypass token. This keeps the guard symmetric with login.tsx, which routes
  // to /diagrams on `isAuthenticated || hasClientJwt()`. Without the JWT branch
  // here, JWT-only logins (owner bypass, worker token, or OAuth in browsers that
  // block third-party cookies) cause an infinite /login <-> /diagrams loop.
  const jwt = hydrated && hasClientJwt();
  return {
    loading: !hydrated || isLoading,
    allowed: isAuthenticated || jwt,
  };
}


