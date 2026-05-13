# Промт 13 — Вкладка налаштувань AI-агентів

## Мета

Додати вкладку "Агенти" до сторінки налаштувань.
Користувач вказує HTTPS-адреси трьох агентів (DRAKON, Архітектор, Документознавець).
Ці адреси зберігаються в AppSettings і використовуються при chat-запитах через Cloudflare Worker.

---

## 1. src/types/settings.ts — додати секцію agents

Додати поле `agents` до типу `AppSettings`:

```typescript
export type AppSettings = {
  github: { owner: string; repo: string; branch: string; token: string };
  n8n: { baseUrl: string; apiKey: string; webhookUrl: string; enabled: boolean };
  app: { workerUrl: string; defaultFolder: string; theme: "light" | "dark" | "system" };
  minio: { endpoint: string; bucket: string; accessKey: string };
  agents: {
    drakonUrl: string;
    architectUrl: string;
    docsUrl: string;
  };
};
```

---

## 2. src/lib/settings-storage.ts — додати defaults і parsing

У `DEFAULT_SETTINGS` додати:

```typescript
agents: {
  drakonUrl: "https://drakon-agent.exodus.pp.ua",
  architectUrl: "https://architect-agent.exodus.pp.ua",
  docsUrl: "https://docs-agent.exodus.pp.ua",
},
```

У функції `readSettings()` у блоці парсингу додати розбір поля `agents` (поруч з `github`, `n8n`, `app`, `minio`):

```typescript
const agents = isObject(parsed.agents) ? parsed.agents : {};
```

І у return:

```typescript
agents: {
  drakonUrl: typeof agents.drakonUrl === "string" && agents.drakonUrl.startsWith("https://")
    ? agents.drakonUrl
    : DEFAULT_SETTINGS.agents.drakonUrl,
  architectUrl: typeof agents.architectUrl === "string" && agents.architectUrl.startsWith("https://")
    ? agents.architectUrl
    : DEFAULT_SETTINGS.agents.architectUrl,
  docsUrl: typeof agents.docsUrl === "string" && agents.docsUrl.startsWith("https://")
    ? agents.docsUrl
    : DEFAULT_SETTINGS.agents.docsUrl,
},
```

Додати helper функцію в кінець файлу:

```typescript
export function getAgentsConfig(): AppSettings["agents"] {
  return readSettings().agents;
}
```

---

## 3. src/lib/agent-api.ts — проксювати через Worker

Імпортуй `getAgentsConfig` з `@/lib/settings-storage` і `getAccessToken` з `@/lib/auth`.

Замінити функцію `sendToAgent` на версію що надсилає через Worker:

```typescript
export async function sendToAgent(
  agentId: AgentId,
  message: string,
  context?: Record<string, unknown>,
): Promise<AgentReply> {
  const settings = readSettings();
  const workerUrl = settings.app.workerUrl.replace(/\/+$/, "");
  const token = getAccessToken();

  const agentUrlMap: Record<AgentId, string> = {
    drakon: settings.agents.drakonUrl,
    architect: settings.agents.architectUrl,
    docs: settings.agents.docsUrl,
  };
  const agentUrl = agentUrlMap[agentId];

  const resp = await fetch(`${workerUrl}/v1/agents/${agentId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, context, agentUrl }),
  });

  if (!resp.ok) {
    throw new Error(`${AGENT_LABELS[agentId]} agent error: ${resp.status}`);
  }
  const data = await resp.json();
  return {
    reply: data.reply ?? data.message ?? JSON.stringify(data),
    diagrams: data.diagrams,
  };
}
```

Також видали функцію `getAgentUrl`, `AGENT_TUNNEL_URLS`, `AGENT_PORTS`, `STORAGE_KEY_PREFIX`, `LEGACY_KEY` — вони більше не потрібні.
Залиш `getAgentLabel`, `checkAgentHealth`, `sendFeedback`.

`checkAgentHealth` треба оновити — нехай перевіряє через Worker:

```typescript
export async function checkAgentHealth(agentId: AgentId): Promise<boolean> {
  try {
    const settings = readSettings();
    const workerUrl = settings.app.workerUrl.replace(/\/+$/, "");
    const resp = await fetch(`${workerUrl}/v1/agents/${agentId}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
```

---

## 4. src/pages/SettingsPage.tsx — сторінка з вкладками

Замінити весь файл на повноцінну сторінку з вкладками.
Зараз там `placeholder`. Потрібні такі вкладки:
- **Загальні** (app.workerUrl, app.theme)
- **GitHub** (github.owner, repo, branch, token)
- **Агенти** — нова вкладка
- **MinIO** (minio.endpoint, bucket, accessKey)
- **n8n** (n8n.baseUrl, apiKey, webhookUrl, enabled)

Для вкладки **Агенти** показати:

```
Агент DRAKON (порт 8765)
[input: HTTPS URL]  — placeholder "https://drakon-agent.example.com"

Агент Архітектор (порт 8766)
[input: HTTPS URL]  — placeholder "https://architect-agent.example.com"

Агент Документознавець (порт 8767)
[input: HTTPS URL]  — placeholder "https://docs-agent.example.com"

[Зберегти агентів]
```

Кожне поле має валідацію: URL повинен починатись з `https://`.
Після успішного збереження показати toast "Налаштування агентів збережено".

Використай компоненти: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` з `@/components/ui/tabs`,
`Input` з `@/components/ui/input`, `Button`, `Label`, `useToast`.

Читай / зберігай через `readSettings()` / `updateSettings()` з `@/lib/settings-storage`.
