/// <reference types="@cloudflare/workers-types" />
import { createMiddleware } from "hono/factory";
import { Tenant } from "./auth.js";

type QuotaEnv = {
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    tenant: Tenant;
    llmCalls?: number;
  };
};

export const quotaMiddleware = createMiddleware<QuotaEnv>(async (c, next) => {
  const t = c.get("tenant");
  const row = await c.env.DB.prepare(
    "SELECT llm_quota_monthly, llm_consumed FROM billing_profiles WHERE tenant_id = ?"
  ).bind(t.teamId).first<{ llm_quota_monthly: number; llm_consumed: number }>();

  if (row && row.llm_consumed >= row.llm_quota_monthly) {
    return c.json({ error: "Квоту LLM на місяць вичерпано", upgrade: "/settings/billing" }, 402);
  }
  await next();
  // інкремент у фоні — не блокує відповідь
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "UPDATE billing_profiles SET llm_consumed = llm_consumed + ?, updated_at = datetime('now') WHERE tenant_id = ?"
    ).bind(c.get("llmCalls") ?? 1, t.teamId).run()
  );
});
