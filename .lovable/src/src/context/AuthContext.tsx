import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { account } from "@/lib/appwrite";
import type { Models } from "appwrite";
import { hasClientJwt } from "@/lib/route-auth";
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
    account
      .get()
      .then(async (u) => {
        setUser(u);
        if (u && !hasClientJwt()) {
          try {
            const jwtObj = await account.createJWT();
            setAccessToken(jwtObj.jwt);
          } catch (err) {
            console.error("Failed to generate JWT on auth mount:", err);
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    const u = await account.get();
    setUser(u);
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

