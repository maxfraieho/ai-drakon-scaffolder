import { createFileRoute } from "@tanstack/react-router";
import { TutorialGame } from "@/components/tutorial/TutorialGame";

export const Route = createFileRoute("/tutorial")({
  component: TutorialRoute,
});

function TutorialRoute() {
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100">
      <TutorialGame />
    </div>
  );
}
