import { createFileRoute } from "@tanstack/react-router";
import kgData from "../../../.understand-anything/knowledge-graph.json";

export const Route = createFileRoute("/api/knowledge-graph")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(kgData), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
