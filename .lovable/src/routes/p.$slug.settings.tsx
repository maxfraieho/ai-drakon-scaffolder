import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/SettingsPage";

export const Route = createFileRoute("/p/$slug/settings")({
  component: ProjectSettingsRoute,
});

function ProjectSettingsRoute() {
  return <SettingsPage />;
}
