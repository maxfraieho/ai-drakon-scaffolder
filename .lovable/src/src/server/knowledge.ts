const GATEWAY_URL = "https://garden-mcp.aidrakon.tech";

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getOwnerToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry - 60_000) {
    return _cachedToken;
  }

  const password = process.env.GARDEN_OWNER_PASSWORD;
  if (!password) {
    throw new Error("GARDEN_OWNER_PASSWORD not configured");
  }

  const res = await fetch(`${GATEWAY_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    throw new Error(`Garden auth failed: ${res.status}`);
  }

  const data = await res.json() as { success: boolean; token: string };
  if (!data.success || !data.token) {
    throw new Error("Garden auth: invalid response");
  }

  // JWT expires in 24h — cache for 23h
  _cachedToken = data.token;
  _tokenExpiry = now + 23 * 60 * 60 * 1000;
  return _cachedToken;
}

export async function handleProxyRequest(
  path: string,
  method: string,
  request: Request,
  options?: { forwardBody?: boolean }
) {
  let token: string;
  try {
    token = await getOwnerToken();
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = `${GATEWAY_URL}${path}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const zoneCode = request.headers.get("x-zone-code");
  if (zoneCode) headers.set("x-zone-code", zoneCode);

  let body: any = undefined;
  if (options?.forwardBody !== false && method !== "GET" && method !== "HEAD") {
    try {
      body = await request.text();
    } catch {}
  }

  try {
    const res = await fetch(url, { method, headers, body });
    const resText = await res.text();
    return new Response(resText, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Gateway Proxy Error: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
