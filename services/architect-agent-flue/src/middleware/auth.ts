/// <reference types="@cloudflare/workers-types" />
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { Client, Account, Databases } from "node-appwrite";

export type Tenant = {
  userId: string;
  teamId: string;
  plan: "free" | "pro" | "enterprise";
};

type AuthEnv = {
  Bindings: {
    SESSION_KV: KVNamespace;
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
    APPWRITE_API_KEY: string;
  };
  Variables: { tenant: Tenant };
};

const SESSION_TTL = 480; // 8 хв — Appwrite JWT живе 15 хв, кеш коротший
const DB_ID = "ai-drakon";
const BILLING_COL = "billing_profiles";

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolvePlan(env: AuthEnv["Bindings"], userId: string): Promise<Tenant["plan"]> {
  try {
    const client = new Client()
      .setEndpoint(env.APPWRITE_ENDPOINT)
      .setProject(env.APPWRITE_PROJECT_ID)
      .setKey(env.APPWRITE_API_KEY);
    const doc = await new Databases(client).getDocument(DB_ID, BILLING_COL, userId);
    return (doc.planType ?? "free") as Tenant["plan"];
  } catch {
    return "free";
  }
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
    const teamId = user.$id; // teams — потім
    const tenant: Tenant = {
      userId: user.$id,
      teamId,
      plan: await resolvePlan(c.env, user.$id),
    };
    await c.env.SESSION_KV.put(cacheKey, JSON.stringify(tenant), { expirationTtl: SESSION_TTL });
    c.set("tenant", tenant);
    return next();
  } catch {
    return c.json({ error: "Сесія недійсна або протермінована" }, 401);
  }
});
