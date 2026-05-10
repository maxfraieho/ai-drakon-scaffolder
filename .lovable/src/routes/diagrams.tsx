import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DiagramsPage } from "@/pages/DiagramsPage";

export const Route = createFileRoute("/diagrams")({
  component: DiagramsRoute,
});

function DiagramsRoute() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <DiagramsPage />;
}
