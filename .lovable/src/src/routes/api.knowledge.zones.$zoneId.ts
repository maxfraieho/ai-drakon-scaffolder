import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/knowledge/zones/$zoneId")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const { zoneId } = params;
        return handleProxyRequest(`/zones/${zoneId}`, "DELETE", request);
      },
    },
  },
});
