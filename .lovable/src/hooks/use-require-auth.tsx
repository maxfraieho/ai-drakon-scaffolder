import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { PageSkeleton } from "@/components/app/PageSkeleton";
import { useAuth } from "@/context/AuthContext";

export function useRequireAuth(children: ReactNode) {
const location = useLocation();
const { isAuthenticated, isLoading } = useAuth();

if (isLoading) {
return <PageSkeleton />;
}

if (!isAuthenticated) {
return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

return <>{children}</>;
}

