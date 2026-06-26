import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/code")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
