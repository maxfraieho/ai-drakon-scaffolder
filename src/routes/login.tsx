import { Navigate, createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  if (typeof window !== "undefined" && localStorage.getItem("jwt")) {
    return <Navigate to="/diagrams" replace />;
  }

  return <LoginPage />;
}
