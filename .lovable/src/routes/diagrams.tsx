import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/diagrams")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
