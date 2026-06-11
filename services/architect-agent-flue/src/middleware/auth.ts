/// <reference types="@cloudflare/workers-types" />
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { Client, Account } from "node-appwrite";

export type Tenant = {
  userId: string;
  teamId: string;
  plan: "free" | "pro" | "enterprise";
};

type AuthEnv = {
  Bindings: {
    SESSION_KV: KVNamespace;
    DB: D1Database;
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
  };
  Variables: { tenant: Tenant };
};

const SESSION_TTL = 480; // 8 хв — Appwrite JWT живе 15 хв, кеш коротший

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolvePlan(db: D1Database, teamId: string): Promise<Tenant["plan"]> {
  const row = await db
    .prepare("SELECT plan_type FROM billing_profiles WHERE tenant_id = ?")
    .bind(teamId)
    .first<{ plan_type: Tenant["plan"] }>();
  return row?.plan_type ?? "free";
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // Основний шлях: Appwrite JWT від фронтенду (account.createJWT()).
  // Cookie-фолбек спрацьовує лише на спільному з Appwrite домені.
  const bearer = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  const cookie = getCookie(c, `a_session_${c.env.APPWRITE_PROJECT_ID}`);
  const token = bearer || cookie;
  if (!token) {
    return c.json({ error: "Не авторизовано: відсутні Appwrite JWT або сесія" }, 401);
  }

  const cacheKey = `session:${await sha256Hex(token)}`;
  const cached = await c.env.SESSION_KV.get<Tenant>(cacheKey, "json");
  if (cached) {
    c.set("tenant", cached);
    return next();
  }

  const client = new Client()
    .setEndpoint(c.env.APPWRITE_ENDPOINT)
    .setProject(c.env.APPWRITE_PROJECT_ID);
  if (bearer) client.setJWT(bearer);
  else client.setSession(cookie as string);

  try {
    const user = await new Account(client).get();
    const teamId = (user.prefs?.teamId as string | undefined) ?? user.$id;
    const tenant: Tenant = {
      userId: user.$id,
      teamId,
      plan: await resolvePlan(c.env.DB, teamId),
    };
    await c.env.SESSION_KV.put(cacheKey, JSON.stringify(tenant), { expirationTtl: SESSION_TTL });
    c.set("tenant", tenant);
    return next();
  } catch {
    return c.json({ error: "Сесія недійсна або протермінована" }, 401);
  }
});
