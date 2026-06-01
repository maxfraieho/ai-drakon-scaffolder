import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute('/pipeline' as any)({
  beforeLoad: () => {
    throw redirect({ to: '/pipelines', replace: true });
  },
  component: () => null,
});
