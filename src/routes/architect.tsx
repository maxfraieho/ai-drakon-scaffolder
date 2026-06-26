import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/architect")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
