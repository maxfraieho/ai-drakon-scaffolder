# Артефакт 2 — Agent Chat UI + System Prompts + Handoff

---

## ЧАСТИНА A: Промпт для Lovable — AgentChatPanel

```
Додай AgentChatPanel в frontend — чат-інтерфейс для взаємодії з трьома AI-агентами.
Агенти запущені локально (або на сервері 192.168.3.184):
- drakon-agent: порт 8765 (Python → DRAKON схеми)
- architect-agent: порт 8766 (архітектура проекту, naming)
- docs-agent: порт 8767 (документація)

Worker URL читається з Settings (app.workerUrl або env).
Агенти доступні напряму або через Worker proxy.

НЕ чіпати: src/lib/htse/, cloudflare-worker/, DRAKON editor canvas.

КРОК 1 — Тип AgentMessage (src/types/agent-chat.ts):

export type AgentId = "drakon" | "architect" | "docs";

export type AgentMessage = {
  id: string;
  agentId: AgentId;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    diagramId?: string;
    diagrams?: object[];
    feedback?: string;
    correctedIr?: object;
  };
};

export type AgentChatSession = {
  agentId: AgentId;
  messages: AgentMessage[];
  isLoading: boolean;
  error: string | null;
};

КРОК 2 — AgentChatStore (src/store/useAgentChatStore.ts):
Zustand store:
- sessions: Record<AgentId, AgentChatSession>
- activeAgent: AgentId
- setActiveAgent(id)
- sendMessage(agentId, content, metadata?)
- clearHistory(agentId)
- addFeedback(agentId, messageId, feedback, correctedIr?)

КРОК 3 — API методи (src/lib/agent-api.ts):

const AGENT_URLS: Record<AgentId, string> = {
  drakon: getAgentUrl(8765),
  architect: getAgentUrl(8766),
  docs: getAgentUrl(8767),
};

function getAgentUrl(port: number): string {
  const settings = readSettings();
  // Якщо є agentBaseUrl в settings → використати
  // Інакше → Worker proxy або localhost
  return settings.agents?.baseUrl
    ? `${settings.agents.baseUrl}:${port}`
    : `http://192.168.3.184:${port}`;
}

// Надсилає повідомлення агенту
export async function sendToAgent(
  agentId: AgentId,
  message: string,
  metadata?: object
): Promise<string> {
  const url = AGENT_URLS[agentId];
  
  // Для drakon-agent: POST /analyze або POST /chat
  // Для architect/docs: POST /chat
  const endpoint = agentId === "drakon" ? "/analyze" : "/chat";
  
  const body = agentId === "drakon"
    ? { code: message, refine: true }
    : { message, ...metadata };
  
  const resp = await fetch(`${url}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!resp.ok) throw new Error(`Agent ${agentId} error: ${resp.status}`);
  const data = await resp.json();
  
  // Normalize responses
  if (agentId === "drakon") {
    return `Створено ${data.count} схем: ${data.diagrams?.map((d: any) => d.name).join(", ")}`;
  }
  return data.response || data.message || JSON.stringify(data);
}

// Надіслати feedback для навчання
export async function sendFeedback(
  agentId: AgentId,
  diagramName: string,
  feedback: string,
  correctedIr?: object
): Promise<void> {
  const url = AGENT_URLS[agentId];
  await fetch(`${url}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diagram_name: diagramName,
      feedback,
      corrected_ir: correctedIr,
    }),
  });
}

КРОК 4 — AgentChatPanel (src/components/agents/AgentChatPanel.tsx):

Props: { className?: string; defaultAgent?: AgentId }

Layout:
┌─────────────────────────────────────────────┐
│  Agent: [DRAKON ▼] [Architect] [Docs]       │
│  ● Online  http://192.168.3.184:8765        │
├─────────────────────────────────────────────│
│                                             │
│  [AI] Агент готовий. Вставте Python код     │
│  або запитайте про архітектуру проекту.     │
│                                             │
│  [You] def greet(name): ...                 │
│                                             │
│  [AI] Створено 1 схему: greet               │
│  [Відкрити в редакторі] [Дати зворотній зв'язок] │
│                                             │
├─────────────────────────────────────────────│
│  [повідомлення...              ] [Надіслати]│
│  [📎 Код] [📋 Поточна схема] [🔄 Очистити] │
└─────────────────────────────────────────────┘

Функції:
1. Вибір агента через tabs або dropdown
2. Показ статусу агента (онлайн/офлайн через GET /health)
3. При відповіді drakon-agent з `diagrams[]`:
   - Показати кнопку "Відкрити в редакторі"
   - Клік → зберегти в MinIO через api.saveDiagram і navigate до editor
4. Кнопка "Дати зворотній зв'язок":
   - Відкриває drawer з textarea для feedback
   - Можливість вказати виправлений JSON IR
   - Відправляє на POST /feedback

КРОК 5 — Inline feedback для drakon diagrams:

Під кожною відповідью з діаграмами показувати:
- Thumbs up 👍 / Thumbs down 👎
- При 👎 → розкривається форма:
  - Textarea: "Що не так?"
  - Textarea: "Правильний JSON IR (опціонально)"
  - Кнопка: "Надіслати для навчання"

КРОК 6 — Додати вкладку "Агенти" в навігацію:

В src/routes/__root.tsx або навігаційному компоненті:
- Нова вкладка/пункт "🤖 Агенти" → відкриває AgentChatPanel як drawer або сторінку

КРОК 7 — Settings: додати Agents секцію в вкладку "Додаток":

- Agent Base URL: input (default: http://192.168.3.184)
- Зберігати в settings.agents.baseUrl

КРОК 8 — Health check для агентів:

useEffect при монтуванні AgentChatPanel:
- GET http://192.168.3.184:8765/health
- GET http://192.168.3.184:8766/health  
- GET http://192.168.3.184:8767/health
- Показувати ● (зелений/червоний) поруч з назвою агента

Після виконання:
1. Список нових файлів
2. Де знаходиться новий пункт навігації
3. Ризики регресії
```

---

## ЧАСТИНА B: System Prompts для агентів

### architect-agent SYSTEM_PROMPT

Зберегти в `services/architect-agent/prompts.py`:

```python
ARCHITECT_SYSTEM_PROMPT = """
Ти — архітектор програмного проекту і куратор DRAKON-схем.
Твоя роль: розуміти проект в цілому, допомагати організовувати схеми,
пропонувати naming convention, будувати ієрархію алгоритмів.

Ти знаєш:
- Поточні DRAKON-схеми проекту (передаються в контексті)
- Файлову структуру GitHub репо (передається в контексті)
- Naming convention: system.* / module.* / flow.* / procedure.*

Naming convention:
- system.overview — загальна схема всього проекту
- module.<name> — схема модуля (напр. module.auth, module.api)
- flow.<name> — потік виконання (напр. flow.save-diagram, flow.analyze-code)
- procedure.<name> — конкретна процедура (напр. procedure.validate-ir)

Твої можливості:
1. Пропонувати назви для нових схем
2. Знаходити схеми які потребують розбиття або об'єднання
3. Визначати зв'язки між схемами (parentDiagramId, childDiagramIds)
4. Відповідати на питання про архітектуру проекту

Формат відповіді:
- Конкретні рекомендації, не абстрактні поради
- Якщо пропонуєш нову схему — вказуй: name, level (L0/L1/L2/L3), filePaths
- Якщо знайшов проблему — пояснюй що не так і як виправити

Мова: відповідай тією ж мовою, якою говорить користувач.
"""

ARCHITECT_CONTEXT_TEMPLATE = """
Поточний стан проекту:
Схеми: {diagrams_summary}
Файли в репо: {repo_files_summary}
Користувацький запит: {user_message}
"""
```

### docs-agent SYSTEM_PROMPT

Зберегти в `services/docs-agent/prompts.py`:

```python
DOCS_SYSTEM_PROMPT = """
Ти — документаліст програмного проекту.
Твоя роль: аналізувати Python/TypeScript код і створювати зрозумілу документацію
яка стане контекстом для DRAKON-агента при генерації схем.

Ти створюєш:
1. module-summary: 2-3 речення що робить модуль в контексті проекту
2. function-docs: назва функції + що вона робить (НЕ як, а ЩО)
3. domain-glossary: терміни предметної області проекту

Формат виводу завжди Markdown:

## Модуль: <назва>
<2-3 речення опису>

### Функції
- `function_name(params)` — що вона робить у бізнес-контексті

### Терміни предметної області
- `термін` — що означає в цьому проекті

Правила:
- НЕ описуй технічну реалізацію (не "викликає метод X")
- Описуй БІЗНЕС-логіку ("перевіряє чи авторизований користувач")
- Використовуй терміни конкретного проекту
- Максимум 80 символів на рядок

Мова: відповідай тією ж мовою що і код/коментарі в проекті.
"""
```

---

## ЧАСТИНА C: Handoff для наступної сесії

### Поточний стан (12.05.2026)

**Всі 3 агенти запущені:**
```
drakon-agent    → http://192.168.3.184:8765  (Python → DRAKON IR)
architect-agent → http://192.168.3.184:8766  (архітектура + naming)
docs-agent      → http://192.168.3.184:8767  (документація + контекст)
```

**Тести: 21/21 зелених**
**KB: 8 файлів в services/drakon-agent/knowledge/ (01-08)**
**Skills: 13 skills в .claude/skills/**

### Що треба зробити

1. **AgentChatPanel** — Lovable промпт вище (Частина A)
2. **Feedback збереження** — POST /feedback в drakon-agent не зберігає дані (TODO)
   Реалізувати: зберігати в knowledge/ як новий .md файл для оновлення BM25
3. **Architect читає KB** — при старті читати knowledge/ і включати в system prompt
4. **Docs → Drakon контекст** — docs-agent генерує context/ файли, drakon-agent читає

### Команди для швидкого старту нової сесії

```bash
# Перевірити що всі агенти живі
curl http://192.168.3.184:8765/health
curl http://192.168.3.184:8766/health
curl http://192.168.3.184:8767/health

# Клонувати репо якщо потрібно
git clone git@github.com:maxfraieho/ai-drakon-setup.git
cd ai-drakon-setup

# Запустити агентів
cd services/drakon-agent && .venv/bin/python3 main.py &
cd services/architect-agent && .venv/bin/python3 main.py &
cd services/docs-agent && .venv/bin/python3 main.py &
```
