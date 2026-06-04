import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/notebooklm/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleProxyRequest("/notebooklm/chat", "POST", request);
      },
    },
  },
});
