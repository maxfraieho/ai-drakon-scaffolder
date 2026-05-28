# TASKS — Координація Claude ↔ AGY

> Власник: Claude (оркестратор)
> Виконавець: AGY (executor)
> Оновлено: 2026-05-28 01:20 — OVERNIGHT SPRINT

## Статуси
- `[ ]` — чекає виконання
- `[~]` — в процесі
- `[x]` — виконано ✅
- `[!]` — заблоковано / потрібна допомога

---

## OVERNIGHT SPRINT (2026-05-28)

### TASK-1: NotebookLM bootstrap alignment
```
[ ] TASK-1
  1. notebooklm_chat_ask(notebook_id="6139067a-5776-4b29-8869-7c9f9aed475c",
       query="Дай огляд поточного стану проекту AI-DRAKON: що реалізовано, які відкриті задачі, наступні кроки")
  2. Зберегти відповідь в MemPalace:
       python3 -m mempalace add --wing ai_drakon_scaffolder --room docs
       title="nlm-bootstrap-2026-05-28" content="<відповідь NLM>"
  3. Записати результат в diary (agent: agt-ogy):
       SESSION:2026-05-28|TASK-1:nlm-bootstrap|DONE|<резюме>
```

### TASK-2: Sync GEMINI.md → drn-ai notebook
```
[ ] TASK-2
  1. Прочитати ~/workspace/ai-drakon-scaffolder/GEMINI.md
  2. notebooklm_list_sources(notebook_id="6139067a-5776-4b29-8869-7c9f9aed475c")
     → перевірити чи "GEMINI.md 2026-05-28" вже є
  3. Якщо немає:
       notebooklm_add_source_text(
         notebook_id="6139067a-5776-4b29-8869-7c9f9aed475c",
         title="GEMINI.md 2026-05-28",
         content=<вміст GEMINI.md>
       )
  4. Diary: SESSION:2026-05-28|TASK-2:nlm-sync|DONE
```

### TASK-3: Add AGY as LLM Provider in AgentLlmCard.tsx
```
[x] TASK-3
  Files to edit (BOTH copies):
    ~/workspace/ai-drakon-scaffolder/src/components/agents/AgentLlmCard.tsx
    ~/workspace/ai-drakon-scaffolder/.lovable/src/components/agents/AgentLlmCard.tsx

  Change 1 — Add AGY to PROTOCOL_PRESETS (after anthropic block):
  ---
  agy: {
    baseUrl: "https://agy.exodus.pp.ua",
    apiKey: "",
    hint: "AGY Proxy — Gemini 2.5 Pro + Claude на Android/Termux (Anthropic-compatible)",
    modelsPath: "/v1/models",
    authHeader: (key: string): Record<string, string> => ({
      ...(key ? { "x-api-key": key } : {}),
      "anthropic-version": "2023-06-01",
    }),
  },
  ---

  Change 2 — Add AGY to RECOMMENDED:
  ---
  agy: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-3.1-pro-high",
    "claude-sonnet-4-6",
    "claude-opus-4-6-thinking",
    "gemini-2.5-flash-thinking",
  ],
  ---

  Change 3 — Update type signature:
  const [protocol, setProtocol] = useState<"openai" | "anthropic" | "agy">(...)

  Change 4 — Add SelectItem in UI:
  <SelectItem value="agy">AGY (Gemini+Claude)</SelectItem>

  Change 5 — handleProtocolChange type:
  const handleProtocolChange = (p: "openai" | "anthropic" | "agy") => {

  ВАЖЛИВО: sync both src/ and .lovable/src/ copies identically!

  git add src/components/agents/AgentLlmCard.tsx .lovable/src/components/agents/AgentLlmCard.tsx
  git commit -m "feat(agents): add AGY proxy as LLM provider option in AgentLlmCard"
  git push origin main

  Diary: SESSION:2026-05-28|TASK-3:agy-provider|DONE|commit:<hash>
```

### TASK-4: Add AGY to DEFAULT_SETTINGS.cliAgents
```
[x] TASK-4
  Files to edit (BOTH copies):
    ~/workspace/ai-drakon-scaffolder/src/lib/settings-storage.ts
    ~/workspace/ai-drakon-scaffolder/.lovable/src/lib/settings-storage.ts

  Find this block:
    cliAgents: [
      { id: "cli1", url: "https://claude.exodus.pp.ua", label: "RPi 3B", apiKey: "" },
      { id: "cli2", url: "https://claude2.exodus.pp.ua", label: "OrangePi", apiKey: "" },
    ],

  Replace with:
    cliAgents: [
      { id: "cli1", url: "https://claude.exodus.pp.ua", label: "RPi 3B", apiKey: "" },
      { id: "cli2", url: "https://claude2.exodus.pp.ua", label: "OrangePi", apiKey: "" },
      { id: "cli3", url: "https://agy.exodus.pp.ua", label: "AGY (Gemini)", apiKey: "" },
    ],

  git add src/lib/settings-storage.ts .lovable/src/lib/settings-storage.ts
  git commit -m "feat(settings): add AGY proxy as default CLI agent endpoint"
  git push origin main

  Diary: SESSION:2026-05-28|TASK-4:agy-cli-agent|DONE|commit:<hash>
```

### TASK-5: Update PROTOCOL_PRESETS defaults for agents
```
[ ] TASK-5
  Context: Q wants project agents (drakon, architect, docs) to use AGY instead of NIM models.
  Default openai preset currently points to openai-proxy.exodus.pp.ua (free Nvidia NIM).
  
  Files to edit (BOTH copies):
    ~/workspace/ai-drakon-scaffolder/src/components/agents/AgentLlmCard.tsx
    ~/workspace/ai-drakon-scaffolder/.lovable/src/components/agents/AgentLlmCard.tsx

  Find:
    openai: {
      baseUrl: "https://openai-proxy.exodus.pp.ua/v1",
      apiKey: "freecc",
      hint: "OpenAI-сумісний (Bearer токен)",

  The default can stay as is (user can switch to AGY in UI).
  BUT — add a default localStorage initialization in readFromStorage():

  If no saved config exists AND protocol default → set AGY as default:
  Find in readFromStorage():
    const protocol =
      (localStorage.getItem(`${agentId}_llm_protocol`) as "openai" | "anthropic" | null) || "openai";
    return {
      protocol,
      baseUrl: localStorage.getItem(`${agentId}_llm_base_url`) || "",
      
  Change: if no base_url saved, use AGY base URL as default suggestion:
    return {
      protocol,
      baseUrl: localStorage.getItem(`${agentId}_llm_base_url`) || (protocol === "openai" ? "" : ""),

  ACTUALLY: Skip TASK-5 if TASK-3 is complex — TASK-3+4 are sufficient for MVP.
  User can manually set AGY in settings UI.

  Diary: SESSION:2026-05-28|TASK-5:agent-defaults|DONE|or|SKIPPED
```

### TASK-6: Docs generation
```
[ ] TASK-6
  Run 01-docs-agent skill sequence:
  1. Check docs-agent health: curl http://192.168.3.184:8767/health
  2. Trigger docs generation via SSH if endpoint exists:
       sshpass -p "805235io." ssh vokov@192.168.3.184
       "curl -s http://localhost:8767/generate -X POST"
  3. Save any generated docs to MemPalace
  4. Diary: SESSION:2026-05-28|TASK-6:docs-gen|DONE|<summary>
```

### TASK-7: Final session handoff
```
[ ] TASK-7 (завжди виконувати останньою!)
  1. Перевірити статус всіх задач в цьому файлі
  2. git status → зробити commit якщо є незакоміченні зміни в TASKS.md
  3. Оновити ~/workspace/ai-drakon-scaffolder/development/HANDOFF.md:
     - Додати список виконаних задач з хешами комітів
     - Додати відкриті проблеми якщо є
     - Зберегти дату "2026-05-28 overnight"
  4. git add development/TASKS.md development/HANDOFF.md
     git commit -m "chore(handoff): overnight sprint 2026-05-28 results"
     git push origin main
  5. Diary (agent: agt-ogy):
     SESSION:2026-05-28|overnight-sprint|
     DONE:[список TASK-N що виконано]|
     OPEN:[список TASK-N що не виконано + причини]|
     COMMITS:[хеші]|★★★
```

---



### TASK-8: Вивчити NotebookLM "AI-Memory" для проекту
```
[ ] TASK-8
  МЕТА: Дослідити чи можна використати "AI-Memory" notebook (або аналог)
        в проекті AI-DRAKON і для нашої з Claude співпраці.
        Порівняти з MemPalace: разом чи замість?

  КРОК 1: Знайти notebook
    - notebooklm_list_notebooks → шукай "AI-Memory", "AIMemory", "Memory", "ai-memory"
    - Якщо немає → перевір: "Memsearch" (94da733f) або "Context Mode" (df88b47d)
    - Якщо зовсім нема → CREATE: notebooklm_create_notebook(title="AI-Memory")

  КРОК 2: Наповнити знаннями (якщо порожній)
    - Додай джерела:
      a) notebooklm_add_source_text: "MemPalace capabilities"
         content = опис MemPalace: semantic search, wings/rooms/drawers, diary, kg, tunnels
      b) notebooklm_add_source_text: "AI-DRAKON project memory needs"
         content = "AGY+Claude collaboration, session continuity, code context between sessions,
                    task tracking, handoff notes, knowledge base for project"

  КРОК 3: Дослідження через chat
    Q1: notebooklm_chat_ask(notebook_id=<id>,
          query="Як AI агенти можуть використовувати NotebookLM для міжсесійної пам'яті?
                 Порівняй з ChromaDB/MemPalace підходом")
    Q2: notebooklm_chat_ask(notebook_id=<id>,
          query="Що краще для AI-DRAKON розробки: NotebookLM як знання-база
                 поряд з MemPalace як оперативна пам'ять? Чи може NotebookLM замінити MemPalace?")
    Q3: notebooklm_chat_ask(notebook_id=<id>,
          query="Запропонуй конкретну схему: як AGY + Claude мають використовувати
                 NotebookLM і MemPalace разом для ефективної розробки AI-DRAKON")

  КРОК 4: Зберегти результати
    - python3 -m mempalace add --wing ai_drakon_scaffolder --room docs
      title="ai-memory-research-2026-05-28"
      content="<відповіді з NLM>"
    - Зберегти summary в ~/workspace/ai-drakon-scaffolder/development/AI_MEMORY_RESEARCH.md
    - git add development/AI_MEMORY_RESEARCH.md
    - git commit -m "docs(research): AI-Memory NotebookLM vs MemPalace analysis"
    - git push origin main

  КРОК 5: Diary
    SESSION:2026-05-28|TASK-8:ai-memory-research|
    NOTEBOOK_ID:<id>|
    VERDICT:<поряд/замість/не підходить>|
    REASON:<чому>|
    COMMITS:<hash>|★★★

  ПІДКАЗКА для оцінки:
  - MemPalace КРАЩЕ для: оперативна пам'ять між сесіями, семантичний пошук коду,
    автоматичне mine (codetomd), KG графи, diary
  - NotebookLM КРАЩЕ для: довгострокові знання, Q&A з документами,
    генерація artifacts (podcasts, mind maps), ручне куратурство знань
  - ВИСНОВОК (попередній Claude): РАЗОМ — NLM=знання-база, MemPalace=робоча пам'ять
```
## Завершені задачі

```
[x] BUG-8: DRAKON Logic tab (eac7908, 2026-05-27)
[x] BUG-6: AgentChatPanel wired (c9ab047)
[x] BUG-7: createPipeline() + plus btn (c9ab047)
[x] MemPalace mine: 1439 files, 19 drawers healed (2026-05-28)
[x] ChromaDB patch (chroma.py + mcp_server.py + repair.py)
[x] GEMINI.md: NotebookLM IDs added (e4d23c8)
[x] TASKS.md: created (e4d23c8)
[x] HANDOFF.md: updated (9b03985)
[x] cloudflared: agy.exodus.pp.ua DNS + tunnel ACTIVE (OrangePi, 2026-05-28 01:15)
```

---

## Примітки

- agy.exodus.pp.ua → http://192.168.3.195:8080 (через cloudflared OrangePi)
- API тест: curl https://agy.exodus.pp.ua/health → {"status":"ok",...}
- Потрібен "anthropic" або "openai" протокол (обидва підтримуються проксі)
- AGY моделі: gemini-2.5-pro (найкраща), gemini-2.5-flash (швидка), claude-sonnet-4-6


### TASK-9: Install ai-memory — cross-agent handoff Claude<->AGY
```
[ ] TASK-9
  META: Install akitaonrails/ai-memory on 192.168.3.184 as shared memory layer
        between Claude Code (OrangePi) and AGY (Termux).
        ai-memory = automatic session capture + handoff between agents.
  
  SOURCE: https://github.com/akitaonrails/ai-memory
  NotebookLM: 9386840e-d2e2-4c16-996a-a13f87898667 (AI-Memory notebook already in NLM)

  === STEP 1: Install server on 192.168.3.184 ===
  
  sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 bash << 'REMOTE'
    set -e
    docker --version
    mkdir -p ~/ai-memory-data
    docker pull ghcr.io/akitaonrails/ai-memory:latest || docker pull akitaonrails/ai-memory:latest
    docker rm -f ai-memory 2>/dev/null || true
    docker run -d \
      --name ai-memory \
      --restart unless-stopped \
      -p 8790:8790 \
      -v ~/ai-memory-data:/data \
      ghcr.io/akitaonrails/ai-memory:latest
    sleep 3
    curl -s http://localhost:8790/health || echo "NOT UP - check docker logs ai-memory"
    docker logs ai-memory 2>&1 | tail -20
REMOTE

  -> Log result in diary: ai-memory running at 192.168.3.184:8790

  === STEP 2: Create .ai-memory.toml workspace markers ===
  
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    'printf "[workspace]\nname = ai-drakon\nserver = http://192.168.3.184:8790\n" > ~/ai-memory-data/.ai-memory.toml'

  === STEP 3: Configure session scripts for AGY/Termux ===
  
  Create ~/bin/ai-memory-start.sh:
    #!/data/data/com.termux/files/usr/bin/bash
    SESSION_ID="agt-ogy-$(date +%Y%m%d-%H%M%S)"
    curl -sf -X POST http://192.168.3.184:8790/api/sessions \
      -H "Content-Type: application/json" \
      -d "{\"agent\":\"agt-ogy\",\"session_id\":\"$SESSION_ID\",\"action\":\"start\"}" \
      || echo "[ai-memory] unreachable"
    echo "$SESSION_ID" > /tmp/.current-ai-memory-session
  chmod +x ~/bin/ai-memory-start.sh
  
  Create ~/bin/ai-memory-end.sh:
    #!/data/data/com.termux/files/usr/bin/bash
    SESSION_ID=$(cat /tmp/.current-ai-memory-session 2>/dev/null || echo "unknown")
    curl -sf -X POST http://192.168.3.184:8790/api/sessions \
      -H "Content-Type: application/json" \
      -d "{\"agent\":\"agt-ogy\",\"session_id\":\"$SESSION_ID\",\"action\":\"end\"}" \
      || true
  chmod +x ~/bin/ai-memory-end.sh

  === STEP 4: Test ===
  
  curl -s http://192.168.3.184:8790/health
  -> should return JSON with status ok
  
  curl -s -X POST http://192.168.3.184:8790/api/notes \
    -H "Content-Type: application/json" \
    -d '{"agent":"agt-ogy","content":"AGY connected to ai-memory 2026-05-28","tags":["test","setup"]}'
  -> should return JSON with id

  === STEP 5: Leave instructions for Claude in TASKS.md ===
  
  Append after this task block:
  
  ## ai-memory server info (for Claude — OrangePi hooks)
  Server: http://192.168.3.184:8790
  Web UI: http://192.168.3.184:8790/web
  Claude Code hooks to install on OrangePi:
    curl -fsSL https://raw.githubusercontent.com/akitaonrails/ai-memory/main/scripts/install.sh | bash
    ai-memory install-hooks --agent claude-code --server http://192.168.3.184:8790 --apply
    ai-memory install-mcp --client claude-code --server http://192.168.3.184:8790 --apply

  === STEP 6: Diary + commit ===
  
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-28|TASK-9:ai-memory-install|SERVER:192.168.3.184:8790|STATUS:<UP/FAILED>|AGY-HOOKS:<yes/no>|***"
  
  git add development/TASKS.md
  git commit -m "chore(tasks): TASK-9 ai-memory install result"
  git push origin main
```
