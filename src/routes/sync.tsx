import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sync")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
