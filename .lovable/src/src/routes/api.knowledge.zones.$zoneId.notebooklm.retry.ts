import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/knowledge/zones/$zoneId/notebooklm/retry")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { zoneId } = params;
        return handleProxyRequest(`/zones/${zoneId}/notebooklm/retry-import`, "POST", request);
      },
    },
  },
});
