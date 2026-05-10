import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/index/")({
  component: IndexAlias,
});

function IndexAlias() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/diagrams", replace: true });
  }, [navigate]);
  return null;
}
