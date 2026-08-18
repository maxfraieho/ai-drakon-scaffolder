import { Link, useLocation, useParams } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { BuildProgress } from "@/components/playpipe/BuildProgress";
import { Button } from "@/components/ui/button";

export function PlayPipeBuildPage() {
  const { slug } = useParams({ from: "/p/$slug/playpipe/build" });
  const location = useLocation();
  const buildId = new URLSearchParams(location.search).get("buildId")?.trim() ?? "";

  if (!buildId) {
    return (
      <div className="astryx-migrated rounded-xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="font-[Outfit] text-xl">Missing buildId</h1>
        </div>
        <p className="text-sm text-rose-200">Open this page using /p/{slug}/playpipe/build?buildId=xxx.</p>
        <Button asChild className="mt-4 bg-rose-600 text-white hover:bg-rose-500">
          <Link to="/p/$slug/playpipe" params={{ slug }}>
            Back to PlayPipe
          </Link>
        </Button>
      </div>
    );
  }

  return <BuildProgress slug={slug} buildId={buildId} />;
}
