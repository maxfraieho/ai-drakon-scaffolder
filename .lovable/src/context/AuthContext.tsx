import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { account } from "@/lib/appwrite";
import type { Models } from "appwrite";
import { setAccessToken } from "@/lib/auth";

type AuthContextValue = {
  user: Models.User<Models.Preferences> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authPromise = account.get();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Auth request timed out")), 5000)
    );

    Promise.race([authPromise, timeoutPromise])
      .then(async (u) => {
        setUser(u);
        if (u) {
          const stored = localStorage.getItem("jwt");
          if (stored !== "drakon-mcp-2026") {
            try {
              const jwtObj = await account.createJWT();
              setAccessToken(jwtObj.jwt);
            } catch (err) {
              console.error("Failed to generate JWT on auth mount:", err);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Auth initialization failed or timed out:", err);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Silent Refresh для Appwrite JWT (15хв expiry)
  // Periodically refresh the token every 10 minutes if user is authenticated via Appwrite.
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
      const stored = localStorage.getItem("jwt");
      if (stored === "drakon-mcp-2026") return;

      try {
        const jwtObj = await account.createJWT();
        setAccessToken(jwtObj.jwt);
        console.log("Appwrite JWT silently refreshed.");
      } catch (err) {
        console.error("Failed to silently refresh Appwrite JWT:", err);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(intervalId);
  }, [user]);

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    const u = await account.get();
    setUser(u);
    try {
      const jwtObj = await account.createJWT();
      setAccessToken(jwtObj.jwt);
    } catch (err) {
      console.error("Failed to generate JWT on login:", err);
    }
  };

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

