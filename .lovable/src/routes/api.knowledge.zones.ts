import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/knowledge/zones")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const resp = await handleProxyRequest("/zones/list", "GET", request);
        const text = await resp.text();
        try {
          const body = JSON.parse(text) as any;
          const rawZones = Array.isArray(body)
            ? body
            : Array.isArray(body.zones)
            ? body.zones
            : [];
          const zones = rawZones.map((z: any) => ({
            id: z.id ?? z.zoneId ?? "",
            name: z.name ?? "",
            description: z.description,
            expiresAt: z.expiresAt,
            createdAt: z.createdAt,
            noteCount: z.noteCount ?? 0,
            accessType: (z.accessType ?? "web") as "web" | "mcp" | "both",
            notebookLmStatus: (z.notebookLmStatus ?? "none") as "none",
            accessCode: z.accessCode,
            webUrl: z.webUrl ?? z.zoneUrl,
            mcpUrl: z.mcpUrl,
            folders: z.folders ?? [],
          }));
          return new Response(
            JSON.stringify({ success: true, zones }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch {
          // pass through raw response if not JSON
          return new Response(text, {
            status: resp.status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async ({ request }) => {
        const resp = await handleProxyRequest("/zones/create", "POST", request);
        const text = await resp.text();
        try {
          const body = JSON.parse(text) as any;
          if (body.success && (body.zoneId ?? body.id)) {
            const zone = {
              id: body.zoneId ?? body.id ?? "",
              name: body.name ?? "",
              description: body.description,
              accessCode: body.accessCode,
              webUrl: body.webUrl ?? body.zoneUrl,
              mcpUrl: body.mcpUrl,
              expiresAt: body.expiresAt,
              noteCount: body.noteCount ?? 0,
              notebookLmStatus: "none" as const,
              accessType: (body.accessType ?? "web") as "web" | "mcp" | "both",
              folders: body.folders ?? [],
            };
            return new Response(
              JSON.stringify({ success: true, zone }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(text, {
            status: resp.status,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(text, {
            status: resp.status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
