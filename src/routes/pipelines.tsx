import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pipelines")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
