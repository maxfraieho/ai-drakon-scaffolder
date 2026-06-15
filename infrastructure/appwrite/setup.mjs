#!/usr/bin/env node
/**
 * Idempotent-міграція колекцій Appwrite для AI-DRAKON SaaS.
 * Запуск: APPWRITE_API_KEY=... node infrastructure/appwrite/setup.mjs
 * Повторний запуск безпечний — конфлікти (409) ігноруються.
 *
 * Потрібні scope ключа: databases.read, databases.write, collections.read,
 * collections.write, attributes.read, attributes.write
 */

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const PROJECT = process.env.APPWRITE_PROJECT_ID || "6a23420a003a04b4997b";
const KEY = process.env.APPWRITE_API_KEY;
if (!KEY) {
  console.error("ПОМИЛКА: задай APPWRITE_API_KEY (Appwrite Console → Integrations → API keys)");
  process.exit(1);
}

const DB_ID = "ai-drakon";

async function call(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": PROJECT,
      "X-Appwrite-Key": KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 409) {
    console.log(`  = вже існує: ${path.split("/").pop()}`);
    return null;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${json.message || JSON.stringify(json)}`);
  }
  return json;
}

const str = (key, size, required = true, opts = {}) =>
  ({ kind: "string", body: { key, size, required, ...opts } });
const en = (key, elements, required = true) =>
  ({ kind: "enum", body: { key, elements, required } });
const dt = (key, required = true) => ({ kind: "datetime", body: { key, required } });
const int = (key, required = true, opts = {}) =>
  ({ kind: "integer", body: { key, required, ...opts } });

async function createCollection(id, name, documentSecurity, attrs) {
  console.log(`Колекція ${id}:`);
  await call("POST", `/databases/${DB_ID}/collections`, {
    collectionId: id,
    name,
    documentSecurity,
    permissions: [], // клієнтських ролей немає; документні права видає Worker при create
  });
  for (const a of attrs) {
    await call("POST", `/databases/${DB_ID}/collections/${id}/attributes/${a.kind}`, a.body);
  }
}

console.log(`Endpoint: ${ENDPOINT}, project: ${PROJECT}`);
await call("POST", "/databases", { databaseId: DB_ID, name: "AI-DRAKON SaaS" });

await createCollection("user_profiles", "User Profiles", true, [
  str("userId", 36), str("teamId", 36), str("displayName", 128),
  str("githubLogin", 64, false), str("defaultProject", 128, false),
  en("locale", ["uk", "en"]), dt("createdAt"),
  str("githubToken", 512, false, { encrypted: true }),
]);

await createCollection("team_settings", "Team Settings", true, [
  str("teamId", 36), str("name", 128),
  en("defaultSandbox", ["virtual", "remote"]),
  en("llmProvider", ["proxy", "anthropic", "openai"]),
  str("proxyUrl", 256, false),
]);

// СЕКРЕТИ: documentSecurity=false + permissions=[] → доступ ТІЛЬКИ через server key
await createCollection("zone_secrets", "Zone Secrets", false, [
  str("zoneId", 36), str("teamId", 36),
  str("mcpAuthToken", 512, true, { encrypted: true }),
]);

await createCollection("audit_log", "Audit Log", true, [
  str("teamId", 36), str("userId", 36), str("action", 64),
  str("details", 4096, false), dt("ts"),
]);

// billing_profiles: server-only (documentSecurity=false), доступ лише через Admin API key
await createCollection("billing_profiles", "Billing Profiles", false, [
  str("userId", 36),
  { kind: "enum", body: { key: "planType", elements: ["free", "pro", "enterprise"], required: true } },
  int("llmQuotaMonthly"),
  int("llmConsumed"),
  dt("updatedAt", false),
]);

console.log("✅ Міграцію Appwrite завершено");
