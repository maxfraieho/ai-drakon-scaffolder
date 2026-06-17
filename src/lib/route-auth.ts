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
  return {
    loading: !hydrated || isLoading,
    allowed: isAuthenticated,
  };
}


