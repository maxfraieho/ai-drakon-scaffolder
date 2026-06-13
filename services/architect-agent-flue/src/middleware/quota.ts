/// <reference types="@cloudflare/workers-types" />
import { createMiddleware } from "hono/factory";
import { Client, Databases } from "node-appwrite";
import { Tenant } from "./auth.js";

const DB_ID = "ai-drakon";
const BILLING_COL = "billing_profiles";

type QuotaEnv = {
  Bindings: {
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
    APPWRITE_API_KEY: string;
  };
  Variables: {
    tenant: Tenant;
    llmCalls?: number;
  };
};

export const quotaMiddleware = createMiddleware<QuotaEnv>(async (c, next) => {
  const t = c.get("tenant");
  const client = new Client()
    .setEndpoint(c.env.APPWRITE_ENDPOINT)
    .setProject(c.env.APPWRITE_PROJECT_ID)
    .setKey(c.env.APPWRITE_API_KEY);
  const db = new Databases(client);

  let profile: any;
  try {
    profile = await db.getDocument(DB_ID, BILLING_COL, t.userId);
  } catch {
    // Auto-provision free profile при першому зверненні
    profile = await db.createDocument(DB_ID, BILLING_COL, t.userId, {
      userId: t.userId,
      planType: "free",
      llmQuotaMonthly: 100,
      llmConsumed: 0,
      updatedAt: new Date().toISOString(),
    }, []);
  }

  if (profile.llmConsumed >= profile.llmQuotaMonthly) {
    return c.json({ error: "Квоту LLM на місяць вичерпано", upgrade: "/settings/billing" }, 402);
  }

  await next();

  // Інкремент у фоні — не блокує відповідь
  c.executionCtx.waitUntil(
    db.updateDocument(DB_ID, BILLING_COL, t.userId, {
      llmConsumed: profile.llmConsumed + (c.get("llmCalls") ?? 1),
      updatedAt: new Date().toISOString(),
    })
  );
});
