import { createFileRoute } from "@tanstack/react-router";
import { nlmMcp } from "../server/notebooklm-mcp";

export const Route = createFileRoute("/api/notebooklm/notebooks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const notebooks = await nlmMcp.listNotebooks();
          return new Response(
            JSON.stringify({ success: true, notebooks }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (e: any) {
          return new Response(
            JSON.stringify({ success: false, error: e.message }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
