import { createFileRoute } from "@tanstack/react-router";
import { handleProxyRequest } from "../server/knowledge";

export const Route = createFileRoute("/api/knowledge/zones")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const resp = await handleProxyRequest("/zones/list", "GET", request);
        try {
          const body = await resp.json() as any;
          // garden-mcp returns array directly or {zones:[]}
          const rawZones = Array.isArray(body) ? body : (body.zones ?? body.data ?? []);
          const zones = rawZones.map((z: any) => ({
            id: z.id ?? z.zoneId,
            name: z.name ?? "",
            description: z.description,
            expiresAt: z.expiresAt,
            createdAt: z.createdAt,
            noteCount: z.noteCount ?? 0,
            accessType: z.accessType ?? "web",
            notebookLmStatus: z.notebookLmStatus ?? "none",
            accessCode: z.accessCode,
            webUrl: z.webUrl ?? z.zoneUrl,
            mcpUrl: z.mcpUrl,
            folders: z.folders ?? [],
          }));
          return new Response(JSON.stringify({ success: true, zones }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return resp;
        }
      },
      POST: async ({ request }) => {
        const resp = await handleProxyRequest("/zones/create", "POST", request, { forwardBody: true });
        try {
          const body = await resp.json() as any;
          if (body.success && (body.zoneId || body.id)) {
            const zone = {
              id: body.zoneId ?? body.id,
              name: body.name ?? "",
              description: body.description,
              accessCode: body.accessCode,
              webUrl: body.webUrl ?? body.zoneUrl,
              zoneUrl: body.zoneUrl,
              mcpUrl: body.mcpUrl,
              expiresAt: body.expiresAt,
              noteCount: body.noteCount ?? 0,
              notebookLmStatus: "none" as const,
              accessType: (body.accessType ?? "web") as "web" | "mcp" | "both",
              folders: body.folders ?? [],
            };
            return new Response(JSON.stringify({ success: true, zone }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify(body), {
            status: resp.status,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return resp;
        }
      },
    },
  },
});
