import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/observability")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
