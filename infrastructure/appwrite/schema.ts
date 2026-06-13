/**
 * Типи колекцій Appwrite Databases для AI-DRAKON SaaS.
 *
 * Розподіл відповідальності:
 *  - Appwrite  = ідентичність, профілі, СЕКРЕТИ (encrypted attributes), audit
 *  - D1        = транзакційні дані (diagrams, pipeline_runs, knowledge_zones, billing)
 *
 * Document-Level Security УВІМКНЕНА для всіх колекцій.
 * Проект: 6a23420a003a04b4997b (fra.cloud.appwrite.io)
 */

export const DATABASE_ID = "ai-drakon";

export const COLLECTIONS = {
  USER_PROFILES: "user_profiles",
  TEAM_SETTINGS: "team_settings",
  ZONE_SECRETS: "zone_secrets",
  AUDIT_LOG: "audit_log",
  BILLING_PROFILES: "billing_profiles",
} as const;

/**
 * user_profiles — створюється при першій реєстрації.
 * Permissions: read/update — лише Role.user(userId). delete — ніхто (тільки Admin).
 */
export interface UserProfile {
  userId: string;          // Appwrite account $id
  teamId: string;          // персональна команда (створюється при onboarding)
  displayName: string;
  githubLogin?: string;
  defaultProject?: string;
  locale: "uk" | "en";
  createdAt: string;       // ISO 8601
}

/**
 * team_settings — налаштування робочого простору.
 * Permissions: read — Role.team(teamId); update — Role.team(teamId, "owner").
 */
export interface TeamSettings {
  teamId: string;
  name: string;
  defaultSandbox: "virtual" | "remote";
  llmProvider: "proxy" | "anthropic" | "openai";
  proxyUrl?: string;       // напр. https://agy3.exodus.pp.ua/v1
}

/**
 * zone_secrets — MCP-токени Зон Знань.
 * mcpAuthToken — ENCRYPTED attribute (шифрування на боці Appwrite).
 * Permissions: ЖОДНИХ клієнтських ролей. Доступ ТІЛЬКИ через Admin API key
 * з Cloudflare Worker (node-appwrite, server-side). D1 тримає лише $id документа.
 */
export interface ZoneSecret {
  zoneId: string;          // = knowledge_zones.id у D1
  teamId: string;
  mcpAuthToken: string;    // encrypted
}

/**
 * audit_log — append-only журнал дій.
 * Permissions: create — Role.team(teamId); update/delete — НІХТО.
 */
export interface AuditLogEntry {
  teamId: string;
  userId: string;
  action: string;          // "zone.created" | "pipeline.run" | "billing.upgraded" | ...
  details: string;         // JSON-рядок
  ts: string;              // ISO 8601
}

/**
 * billing_profiles — білінг профілі користувачів.
 * Permissions: ЖОДНИХ клієнтських ролей. Доступ ТІЛЬКИ через Admin API key.
 */
export interface BillingProfile {
  userId: string;          // Appwrite account $id (також є document $id)
  planType: "free" | "pro" | "enterprise";
  llmQuotaMonthly: number;
  llmConsumed: number;
  updatedAt?: string;
}

/** Ліміти тарифних планів (seed-дані для billing_profiles у D1) */
export const PLAN_LIMITS = {
  free:       { llmQuotaMonthly: 100,   sandbox: "virtual" },
  pro:        { llmQuotaMonthly: 2000,  sandbox: "remote" },
  enterprise: { llmQuotaMonthly: 20000, sandbox: "remote" },
} as const;
