const GATEWAY_URL = "https://garden-mcp.exodus.pp.ua";

export async function handleProxyRequest(
  path: string,
  method: string,
  request: Request,
  options?: { forwardBody?: boolean }
) {
  const token = process.env.GARDEN_OWNER_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GARDEN_OWNER_TOKEN not configured" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const url = `${GATEWAY_URL}${path}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  // Forward optional headers if needed
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  // Forward guest access code if present
  const zoneCode = request.headers.get("x-zone-code");
  if (zoneCode) {
    headers.set("x-zone-code", zoneCode);
  }

  let body: any = undefined;
  if (options?.forwardBody !== false && method !== "GET" && method !== "HEAD") {
    try {
      body = await request.text();
    } catch (e) {
      // Failed to read request body or empty
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
    });

    const resText = await res.text();
    return new Response(resText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Gateway Proxy Error: ${err.message}` }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
