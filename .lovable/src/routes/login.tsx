import { Navigate, createFileRoute } from "@tanstack/react-router";

import { hasClientJwt } from "@/lib/route-auth";
import { LoginPage } from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  if (hasClientJwt()) {
    return <Navigate to="/diagrams" replace />;
  }

  return <LoginPage />;
}
