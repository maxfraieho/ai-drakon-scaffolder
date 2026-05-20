import { createFileRoute } from "@tanstack/react-router";

import { DevCycleCommandCenter } from "@/components/devcycle/DevCycleCommandCenter";

export const Route = createFileRoute("/devcycle")({
  component: DevCyclePage,
});

function DevCyclePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 md:px-6">
      <DevCycleCommandCenter />
    </main>
  );
}