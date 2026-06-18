import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/knowledge/zones/$zoneId/notebooklm")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { zoneId } = params;
        return handleProxyRequest(`/zones/${zoneId}/notebooklm`, "GET", request);
      },
    },
  },
});
