import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/github")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
