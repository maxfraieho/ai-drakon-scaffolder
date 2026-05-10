import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { LoginPage } from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (localStorage.getItem("jwt")) {
    return <Navigate to="/diagrams" replace />;
  }

  return <LoginPage />;
}
