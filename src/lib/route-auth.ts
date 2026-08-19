import { createContext, useContext, useState, useEffect, createElement, type ReactNode } from "react";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export function hasClientJwt(): boolean {
  return Boolean(getAccessToken());
}

// Single source of truth for "has the client finished its first hydration
// pass" — mounted once at the app root (see __root.tsx) and consumed by
// every component that needs to gate a client-only read (localStorage JWT,
// window, etc.) behind hydration. Previously index.tsx and __root.tsx each
// held their own independent `useState(false)` + `useEffect` pair; those
// flip to `true` on different render passes (child effects run before
// parent effects), so the two consumers disagreed for one frame — visible
// as a chrome/content flicker on `/`. One provider, one flip, no race.
const HydratedContext = createContext(false);

export function HydratedProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return createElement(HydratedContext.Provider, { value: hydrated }, children);
}

export function useHydrated(): boolean {
  return useContext(HydratedContext);
}

export function useRequireAuth(): { loading: boolean; allowed: boolean } {
  const { isAuthenticated, isLoading } = useAuth();
  const hydrated = useHydrated();
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
