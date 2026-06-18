import { createFileRoute } from "@tanstack/react-router";
import { nlmMcp } from "../server/notebooklm-mcp";

export const Route = createFileRoute("/api/notebooklm/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { notebookId, question } = await request.json() as any;
          if (!notebookId || !question) {
            return new Response(
              JSON.stringify({ success: false, error: "notebookId and question required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
          const answer = await nlmMcp.chat(notebookId, question);
          return new Response(
            JSON.stringify({ success: true, answer }),
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
