import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/knowledge/zones")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return handleProxyRequest("/zones/list", "GET", request);
      },
      POST: async ({ request }) => {
        return handleProxyRequest("/zones/create", "POST", request);
      },
    },
  },
});
