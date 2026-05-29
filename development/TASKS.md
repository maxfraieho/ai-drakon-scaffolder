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
[x] TASK-1
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
[x] TASK-2
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
[x] TASK-5
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
[x] TASK-6
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
[x] TASK-7 (завжди виконувати останньою!)
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
[x] TASK-8
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

### TASK-17: ai-memory hooks — всі агенти → 192.168.3.184:49374
```
[x] TASK-17
  МЕТА: Всі агенти (Claude Code OrangePi, AGY phone, AGY3 tablet) синхронізуються
        з єдиним ai-memory сервером на 192.168.3.184:49374.
        Без бінарника — тільки curl POST.

  СТАТУС:
    [x] Claude Code (OrangePi) — хуки додано в session-start.sh + mempalace-save.sh
    [x] AGY (phone) — ~/bin/ai-memory-start.sh та ~/bin/ai-memory-end.sh (TASK-9)
    [ ] AGY3 (tablet 192.168.3.162) — потрібно створити

  === AGY3 TABLET — виконати ===

  КРОК 1: Перевір чи вже є скрипти
    ls ~/bin/ai-memory-start.sh 2>/dev/null && echo "вже є" || echo "треба створити"

  КРОК 2: Якщо немає — створи ~/bin/
    mkdir -p ~/bin

  КРОК 3: Створи ~/bin/ai-memory-start.sh
    cat > ~/bin/ai-memory-start.sh << 'SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
SESSION_ID="agy3-tablet-$(date +%Y%m%d-%H%M%S)"
curl -sf -X POST "http://192.168.3.184:49374/hook?event=SessionStart"   -H "Content-Type: application/json"   -d "{"session_id":"$SESSION_ID","cwd":"$(pwd)","agent":"agt-ogy3"}"   --max-time 3 > /dev/null 2>&1
echo "ai-memory: session started [$SESSION_ID]"
SCRIPT
    chmod +x ~/bin/ai-memory-start.sh

  КРОК 4: Створи ~/bin/ai-memory-end.sh
    cat > ~/bin/ai-memory-end.sh << 'SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
SESSION_ID="${1:-agy3-tablet-$(date +%Y%m%d)}"
SUMMARY="${2:-session ended}"
curl -sf -X POST "http://192.168.3.184:49374/hook?event=Stop"   -H "Content-Type: application/json"   -d "{"session_id":"$SESSION_ID","summary":"$SUMMARY","agent":"agt-ogy3"}"   --max-time 3 > /dev/null 2>&1
echo "ai-memory: session stopped"
SCRIPT
    chmod +x ~/bin/ai-memory-end.sh

  КРОК 5: Тест
    curl -s -X POST "http://192.168.3.184:49374/hook?event=SessionStart"       -H "Content-Type: application/json"       -d '{"session_id":"agy3-setup-test","cwd":"/","agent":"agt-ogy3"}'       --max-time 5
    → має повернути: queued

  КРОК 6: Додай виклик в ~/.termux/boot/start-agy-proxy.sh
    echo '' >> ~/.termux/boot/start-agy-proxy.sh
    echo '# ai-memory session start' >> ~/.termux/boot/start-agy-proxy.sh
    echo '~/bin/ai-memory-start.sh &' >> ~/.termux/boot/start-agy-proxy.sh

  КРОК 7: Перевір ai-memory web UI (переконайся що записи з'явились):
    curl -s http://192.168.3.184:49374/health

  КРОК 8: Зафіксуй в git та diary
    sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.195 'cd ~/workspace/ai-drakon-scaffolder && sed -i "s/^\[ \] TASK-17/[x] TASK-17/" development/TASKS.md && git add development/TASKS.md && git commit -m "chore(tasks): TASK-17 ai-memory hooks AGY3 tablet" && git push origin main'

    python3 -m mempalace diary write --agent agt-ogy       "SESSION:2026-05-28|TASK-17:ai-memory-hooks|AGY3.tablet.DONE|server:192.168.3.184:49374|★★"
```


### TASK-18: Дослідження та покращення логіки семантичних зв'язків
```
[x] TASK-18
  МЕТА: Граф документів виглядає перевантажено — занадто багато зв'язків на документ.
        Дослідити best practices побудови knowledge graph links і переписати
        відповідну секцію DOCS_SYSTEM_PROMPT.

  ФАЙЛ ДЛЯ ЗМІНИ:
    /home/vokov/workspace/ai-drakon-scaffolder/services/docs-agent/prompts.py
    (через SSH до 192.168.3.184)

  КРОК 1: Проаналізуй поточну щільність зв'язків
    sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184       "grep -r '\[\[' ~/workspace/ai-drakon-scaffolder/docs/ --include='*.md' | wc -l"
    sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184       "grep -rc '\[\[' ~/workspace/ai-drakon-scaffolder/docs/ --include='*.md' | sort -t: -k2 -rn | head -10"
    → Визнач: скільки зв'язків в середньому на документ? Де максимум?

  КРОК 2: Глибоке дослідження через Gemini Pro
    Використай gemini-2.5-pro (або gemini-3.1-pro-high) і задай ці питання:

    Q1: "What are best practices for semantic link density in knowledge graphs?
         Specifically: how many outgoing links per document is optimal?
         Zettelkasten approach vs. Wikipedia approach vs. ontology approach.
         Give concrete rules for an AI agent generating links."

    Q2: "In a knowledge base with ~60 markdown documents organized by domain tags
         (concept, architecture, kb, manual, plan, report, agent, ux, meta)
         and tiers (1=canonical, 2=active, 3=reference),
         what linking rules would produce a clean, navigable graph?
         Specifically: when should a link be created vs. omitted?"

    Q3: "Review this prompt section for an AI documentation agent and suggest
         improvements to make it generate fewer, more meaningful links:
         [вставити поточну секцію ## Семантичні зв'язки з prompts.py]"

  КРОК 3: Прочитай поточний промпт
    sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184       "cat ~/workspace/ai-drakon-scaffolder/services/docs-agent/prompts.py" |       grep -A 30 "Семантичні зв'язки"

  КРОК 4: Сформулюй нові правила (на основі дослідження)
    Цільові метрики:
    - Максимум 3-5 вихідних зв'язків на документ
    - Tier-1 документи не отримують зв'язків "для повноти"
    - Зв'язок створюється тільки якщо: a) читач ПОТРЕБУЄ цей контекст,
      або b) документи є частинами одного процесу

  КРОК 5: Оновити DOCS_SYSTEM_PROMPT
    Через SSH змінити секцію "Обов'язкова кінцева секція" і "Правила" в prompts.py.
    Додати конкретні обмеження:
    - "Максимум 3 посилання в секції Семантичні зв'язки"
    - "Не додавай зв'язок якщо він очевидний або його можна знайти через _INDEX"
    - "Посилання тільки на документи що БЕЗПОСЕРЕДНЬО потрібні для розуміння"

  КРОК 6: Зберегти дослідження
    sshpass -p "805235io." ssh -o StrictHostKeyChecник=no vokov@192.168.3.184 bash << 'SSHEOF'
    cat > /home/vokov/workspace/ai-drakon-scaffolder/development/LINKS_RESEARCH.md << 'EOF'
---
tags:
  - domain:kb
  - status:active
  - format:reference
created: 2026-05-28
updated: 2026-05-28
tier: 2
title: "Дослідження: оптимальна щільність семантичних зв'язків"
lang: uk
---

# Дослідження: семантичні зв'язки в Knowledge Graph

## Висновки Gemini Pro
<вставити висновки з Кроку 2>

## Нові правила для docs-agent
<вставити нові правила>

## Зміни в DOCS_SYSTEM_PROMPT
<вставити diff або опис змін>

---

## Семантичні зв'язки

**Цей документ є частиною:** [[development/_INDEX]]
**Пов'язано з:** [[docs/META/STANDARD]] — стандарт Garden Bloom
EOF
    cd /home/vokov/workspace/ai-drakon-scaffolder
    git add development/LINKS_RESEARCH.md services/docs-agent/prompts.py
    git commit -m "docs(research): link density rules + update DOCS_SYSTEM_PROMPT"
    git push origin main
    SSHEOF

  КРОК 7: Diary + TASKS.md
    python3 -m mempalace diary write --agent agt-ogy       "SESSION:2026-05-28|TASK-18:links-research|VERDICT:<висновок>|PROMPT_UPDATED:yes|★★★"

    sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.195       'cd ~/workspace/ai-drakon-scaffolder && sed -i "s/^\[ \] TASK-18/[x] TASK-18/" development/TASKS.md && git add development/TASKS.md && git commit -m "chore(tasks): TASK-18 links research done" && git push origin main'
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
[x] TASK-9
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


### TASK-10: Save AGY proxy to maxfraieho/antigravity-claude-proxy on GitHub
```
[x] TASK-10
  META: The AGY proxy (~/CLIProxyAPI/antigravity-claude-proxy) was enhanced with
        /v1/chat/completions OpenAI-compatible endpoint. Save this to GitHub under
        maxfraieho account. Add README describing integration potential with
        free-claude-code-proxy on 192.168.3.184.

  Source repo on Termux: ~/CLIProxyAPI/antigravity-claude-proxy
  Parent upstream: https://github.com/badrisnarayanan/antigravity-claude-proxy
  Target: https://github.com/maxfraieho/antigravity-claude-proxy

  === STEP 1: Clone from Termux onto 192.168.3.184 ===

  sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 bash << 'REMOTE'
    # Clone from Termux via SSH
    rm -rf /tmp/agy-proxy-export
    sshpass -p "123456" git clone \
      ssh://u0_a284@192.168.3.195:8022/data/data/com.termux/files/home/CLIProxyAPI/antigravity-claude-proxy \
      /tmp/agy-proxy-export 2>/dev/null || \
    sshpass -p "123456" rsync -a \
      --exclude=node_modules --exclude=.git \
      -e "ssh -o StrictHostKeyChecking=no -p 8022" \
      u0_a284@192.168.3.195:CLIProxyAPI/antigravity-claude-proxy/ \
      /tmp/agy-proxy-export/
    echo "CLONE DONE"
    ls /tmp/agy-proxy-export/src/ | head -10
REMOTE

  === STEP 2: Create GitHub repo via gh on 192.168.3.184 ===

  sshpass -p "805235io." ssh vokov@192.168.3.184 bash << 'REMOTE'
    gh repo create maxfraieho/antigravity-claude-proxy \
      --public \
      --description "AGY Proxy: Anthropic+OpenAI-compatible API for Google Cloud Code (Gemini). Extends antigravity-cli with /v1/chat/completions endpoint." \
      || echo "Repo may already exist, continuing..."
REMOTE

  === STEP 3: Add README and push ===

  sshpass -p "805235io." ssh vokov@192.168.3.184 bash << 'REMOTE'
    cd /tmp/agy-proxy-export

    # Init git if needed (rsync path)
    git init 2>/dev/null || true
    git checkout -b main 2>/dev/null || true

    # Write README
    cat > README.md << 'READMEEOF'
# antigravity-claude-proxy

> Fork of [badrisnarayanan/antigravity-claude-proxy](https://github.com/badrisnarayanan/antigravity-claude-proxy)

AGY Proxy runs on Android/Termux and provides **dual-protocol API access** to Google Cloud Code (Gemini models via Antigravity CLI):

## Features

- **Anthropic-compatible** `/v1/messages` endpoint (original)
- **OpenAI-compatible** `/v1/chat/completions` endpoint (**added in this fork**)
- Multi-account rotation with rate-limit handling
- SSE streaming support for both protocols
- Web dashboard at `:8080`

## What was added in this fork

```
feat(server): add OpenAI-compatible /v1/chat/completions endpoint
```

Transforms OpenAI-format requests to Anthropic format internally, handles SSE streaming,
enables direct integration with any OpenAI-compatible agent system.

## Deployment

Runs on Android/Termux at port `8080`. Exposed publicly via Cloudflare tunnel:
`https://agy.exodus.pp.ua`

## Integration: free-claude-code-proxy (192.168.3.184)

This proxy can be registered as a custom provider in
[free-claude-code-proxy](https://github.com/maxfraieho/free-claude-code) —
the OpenAI-compatible LLM routing proxy running on dev server.

Integration path:
1. Register `agy-tunnel` provider pointing to `https://agy.exodus.pp.ua/v1`
2. Map Claude/Gemini model slots to AGY models:
   - `sonnet` slot → `gemini-2.5-pro` (reasoning)
   - `haiku` slot → `gemini-2.5-flash` (fast)
3. Rate-limit fallback: if AGY Google account is rate-limited, fall back to NIM models

This creates a hybrid routing layer: free Gemini via AGY + free NIM models as fallback.

## Models available (via AGY health endpoint)

See `/health` for live model availability and rate-limit status.

Primary models:
- `gemini-2.5-pro` — best reasoning
- `gemini-2.5-flash` — fast
- `claude-sonnet-4-6` — via Claude MAX plan
- `claude-opus-4-6-thinking` — extended thinking

## Quick test

```bash
curl https://agy.exodus.pp.ua/health
curl -X POST https://agy.exodus.pp.ua/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'
```
READMEEOF

    # Add .gitignore
    cat > .gitignore << 'GITEOF'
node_modules/
.env
*.log
config/accounts.json
GITEOF

    git add -A
    git commit -m "feat: fork with OpenAI-compatible /v1/chat/completions + README" \
      --author "AGY <agt-ogy@ai-drakon>" 2>/dev/null || \
    git commit --allow-empty -m "feat: fork with OpenAI-compatible /v1/chat/completions + README"

    # Set remote and push
    git remote remove maxfraieho 2>/dev/null || true
    git remote add maxfraieho https://github.com/maxfraieho/antigravity-claude-proxy.git
    git push maxfraieho main --force 2>&1
    echo "PUSH DONE: $?"
REMOTE

  === STEP 4: Verify ===

  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    'gh repo view maxfraieho/antigravity-claude-proxy --json url,description,createdAt 2>/dev/null | python3 -m json.tool'

  === STEP 5: Diary + TASKS.md update ===

  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-28|TASK-10:agy-proxy-github|REPO:maxfraieho/antigravity-claude-proxy|STATUS:<OK/FAIL>|***"

  git add development/TASKS.md
  git commit -m "chore(tasks): TASK-10 agy-proxy GitHub repo result"
  git push origin main
```


### TASK-11: Create comprehensive Claude+AGY collaboration docs in ai-drakon
```
[x] TASK-11
  META: Write docs/COLLABORATION.md in ai-drakon-scaffolder that documents
        the full Claude+AGY development system — settings, protocols, tools, roadmap.
        This is the "how we build AI-DRAKON" reference doc for scaling the team.

  TARGET FILE: ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md
  Also update: ~/workspace/ai-drakon-scaffolder/development/HANDOFF.md (add collaboration section)

  === CONTENT STRUCTURE FOR docs/COLLABORATION.md ===

  ## 1. Overview — Claude+AGY Tandem
  Description:
    - Claude (Sonnet 4.6) = orchestrator: plans, reviews, orchestrates, writes specs
    - AGY (Gemini 2.5 Pro on Termux) = executor: implements code, runs commands, pushes commits
    - Q (human) = product owner: sets direction, confirms decisions, activates AGY
    - Why this split: Claude tokens expensive → AGY free Gemini via Google Cloud Code
    
  ## 2. Infrastructure
  
  | Component | Address | Purpose |
  |-----------|---------|---------|
  | Claude Code | OrangePi 192.168.3.161 :3456 | Main orchestrator |
  | AGY CLI | Termux 192.168.3.195 :8080 | Gemini executor |
  | AGY Proxy | https://agy.exodus.pp.ua | Public API endpoint |
  | Dev Server | 192.168.3.184 | Docker, agents, proxy |
  | ai-memory | 192.168.3.184:49374 | Cross-agent session sync |
  | MemPalace | 192.168.3.184 (Python) | Semantic memory, diary, KG |
  | NotebookLM | 192.168.3.234:8002 | Long-term knowledge base |
  | cloudflared | OrangePi native | Public tunnel for all services |

  ## 3. Three-Layer Memory System
  
  Layer 1 — Operational (MemPalace):
    - Semantic vector search via ChromaDB
    - Diary per agent (agent: agt-ogy for AGY, agent: claude-code for Claude)
    - Knowledge Graph (KG) for structured facts
    - MemPalace mine: 1439+ files indexed
    - Usage: between-session context, code search, task tracking
    
  Layer 2 — Cross-agent sync (ai-memory):
    - Rust binary, SQLite FTS5, git-versioned markdown wiki
    - Auto-capture via lifecycle hooks: SessionStart/Stop
    - AGY hooks: ~/bin/ai-memory-start.sh, ~/bin/ai-memory-end.sh
    - Server: http://192.168.3.184:49374
    - Hook endpoint: POST /hook?event=SessionStart|Stop
    - Web UI: http://192.168.3.184:49374/web
    - Purpose: seamless handoff between Claude and AGY without manual notes
    
  Layer 3 — Knowledge base (NotebookLM):
    - Long-term docs, architecture decisions, research
    - Notebooks: drn-ai (6139067a), AI-Memory (9386840e), Codebase Analysis (2521c922)
    - Usage: deep Q&A about project, artifact generation, human-curated knowledge

  ## 4. Task Coordination Protocol (TASKS.md)
  
  File: development/TASKS.md
  
  Flow:
    1. Claude writes task with EXACT steps, file paths, commands
    2. git commit + push to origin/main
    3. Q activates AGY in Termux: "виконай TASK-N"
    4. AGY reads TASKS.md, executes step by step
    5. AGY marks [x], writes diary, commits, pushes
    6. Claude verifies: git log OR mempalace diary read --agent agt-ogy
  
  Task format:
    [ ] TASK-N: title
      META: what and why
      STEP 1: exact command
      STEP 2: exact command
      VERIFY: what to check
      DIARY: SESSION:date|TASK-N|DONE|details|***

  ## 5. AGY Proxy — Endpoints and Models
  
  Public: https://agy.exodus.pp.ua
  Local: http://192.168.3.195:8080
  
  Endpoints:
    POST /v1/messages         — Anthropic-compatible
    POST /v1/chat/completions — OpenAI-compatible (added in fork)
    GET  /health              — status + rate limits per model
    GET  /v1/models           — model list
  
  GitHub: https://github.com/maxfraieho/antigravity-claude-proxy
  
  Available models:
    gemini-2.5-pro          — best reasoning (use for complex tasks)
    gemini-2.5-flash        — fast (use for quick tasks, rate limited less)
    gemini-3.5-flash-medium — medium speed
    claude-sonnet-4-6       — via Claude MAX plan
    claude-opus-4-6-thinking — extended thinking via Claude MAX

  ## 6. Claude Code Skills System
  
  Skills location: ~/.claude/skills/
  Active skills (Claude Code):
    - notebooklm-mcp   — query/add to NotebookLM notebooks
    - session-current  — show current session status
    - agy-termux       — AGY workflow reference (SSH, proxy API, verification)
  
  Hook system (UserPromptSubmit):
    - MANDATORY SKILL ACTIVATION SEQUENCE on each message
    - Skill evaluation: list all skills, YES/NO with reason
    - Activate YES skills via Skill() tool before implementing
  
  Key workflow skills:
    executing-plans        — batch execute plan tasks with checkpoints
    subagent-driven-dev    — fresh subagent per task + code review
    verification-before-completion — NEVER claim done without verifying
    writing-plans          — create bite-sized implementation plans

  ## 7. Cloudflare Infrastructure
  
  Tunnel: 7c2d896d-2c77-4486-af56-ef30969ca942 (OrangePi native cloudflared)
  Config: /etc/cloudflared/config.yml
  
  Public endpoints:
    agy.exodus.pp.ua         → Termux AGY proxy :8080
    claude.exodus.pp.ua      → RPi 3B Claude :3456
    claude2.exodus.pp.ua     → OrangePi Claude :3456
    drakon-agent.exodus.pp.ua → dev server :8765
    architect-agent.exodus.pp.ua → dev server :8766
    docs-agent.exodus.pp.ua  → dev server :8767
    openai-proxy.exodus.pp.ua → dev server :18880
    garden-mcp.exodus.pp.ua  → dev server :8081
    notebooklm.exodus.pp.ua  → NLM server :8002
    ssh.exodus.pp.ua         → SSH tunnel :22

  ## 8. AI-DRAKON Agents Configuration
  
  Current agent LLM assignments (via web UI settings):
    Architect  → AGY (gemini-2.5-pro)  [ACTIVE ✅]
    DRAKON     → openai-proxy (NIM)    [needs update]
    Docs       → openai-proxy (NIM)    [needs update]
  
  To update: Settings → LLM-провайдер → Protocol: AGY → URL: https://agy.exodus.pp.ua

  ## 9. Roadmap — Scaling

  Phase 1 (DONE ✅):
    - AGY proxy with dual protocol support
    - cloudflared tunnel for AGY
    - ai-memory session sync
    - TASKS.md coordination protocol
    - AGY as LLM provider in ai-drakon UI

  Phase 2 (NEXT):
    - All 3 agents (Architect+DRAKON+Docs) → AGY as primary LLM
    - ai-memory hooks for Claude Code (OrangePi)
    - Claude Code MCP for ai-memory (memory_query, memory_write_page)
    - free-claude-code-proxy: register agy-tunnel as provider with NIM fallback
    - AGY quota management: multi-account rotation

  Phase 3 (FUTURE):
    - Automated TASKS.md: Claude writes, AGY auto-executes on push (webhook)
    - ai-memory cross-session search in Claude Code context
    - NotebookLM auto-sync: after each Claude session → add session summary as source
    - AGY on multiple Android devices for parallel execution

  === STEPS TO EXECUTE ===

  STEP 1: Create the file
    mkdir -p ~/workspace/ai-drakon-scaffolder/docs
    cat > ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md << (content above)

  STEP 2: Verify content (count sections)
    grep "^## " ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md | wc -l
    # Should be 9

  STEP 3: Add to NotebookLM drn-ai notebook
    Use notebooklm_add_source_text(
      notebook_id="6139067a-5776-4b29-8869-7c9f9aed475c",
      title="COLLABORATION.md 2026-05-28",
      content=<file content>
    )

  STEP 4: Commit
    git add docs/COLLABORATION.md GEMINI.md development/TASKS.md
    git commit -m "docs(collaboration): add Claude+AGY collaboration guide with full system map"
    git push origin main

  STEP 5: Diary
    python3 -m mempalace diary write --agent agt-ogy \
      "SESSION:2026-05-28|TASK-11:collaboration-docs|
      FILE:docs/COLLABORATION.md|SECTIONS:9|NLM:added|COMMIT:<hash>|***"
```


### TASK-12: Docs standardization — translate EN→UA + apply Garden formatting
```
[x] TASK-12
  META: 57 markdown files in docs/ need (1) translation EN→UA and (2) formatting
        per Garden Bloom documentation standard (from garden-seedling-stage project).
        Result: unified Ukrainian wiki with wikilinks, frontmatter, _INDEX.md per folder.

  REFERENCE STANDARDS: Read these files FIRST to understand the format:
    sshpass -p "805235io." ssh vokov@192.168.3.184
    cat ~/workspace/garden-seedling-stage-d69fe8be/src/site/notes/ІНДЕКС.md
    cat ~/workspace/garden-seedling-stage-d69fe8be/src/site/notes/manifesto/МАНІФЕСТ.md
    cat ~/workspace/garden-seedling-stage-d69fe8be/src/site/notes/manifesto/_INDEX.md

  WORKSPACE: ~/workspace/ai-drakon-scaffolder/ (Termux)
  OR: sshpass -p "805235io." ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && ..."

  ═══════════════════════════════════════════
  PHASE 1: CREATE DOCS STANDARD (docs/META/STANDARD.md)
  ═══════════════════════════════════════════

  Create ~/workspace/ai-drakon-scaffolder/docs/META/STANDARD.md with:

  ## Frontmatter template (ОБОВЯЗКОВИЙ для кожного файлу)
  ---
  tags:
    - domain:<concept|architecture|kb|manual|plan|report|agent|ux|meta>
    - status:<canonical|active|draft|archived>
    - format:<spec|guide|reference|plan|report|skill|index>
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  tier: <1|2|3>   # 1=canonical, 2=important, 3=reference
  title: "НАЗВА ДОКУМЕНТУ"
  lang: uk
  ---

  ## Tier definitions
  - tier: 1 — canonical (архітектура, концепція, специфікації — не змінюються без CR)
  - tier: 2 — active (мануали, KB, плани — живі документи)
  - tier: 3 — reference (плани реалізації, звіти, UX-аудити)

  ## Wiki links style
  Use [[НАЗВА_ФАЙЛУ]] for cross-references (without extension, uppercase preferred)
  Example: [[01-vision]], [[DRAKON-IR-SPEC]], [[manual-pipeline-a]]

  ## Semantic links section (ОБОВЯЗКОВИЙ наприкінці кожного файлу)
  ---
  ## Семантичні зв'язки
  **Цей документ є частиною:** [[ПАПКА/_INDEX]]
  **Цей документ пов'язаний з:**
  - [[назва-файлу]] — коротке пояснення
  **Цей документ доповнює:** [[назва-файлу]]
  **Читати далі:** [[назва-файлу]]

  ## Domain taxonomy for ai-drakon
  - domain:concept    — vision, philosophy, core ideas
  - domain:architecture — system design, technical decisions
  - domain:kb         — knowledge base, DRAKON IR spec, prompts
  - domain:manual     — how-to guides, user manuals
  - domain:plan       — implementation plans, sprints
  - domain:report     — test results, audits, bug catalogs
  - domain:agent      — agent skills, AGY workflows
  - domain:ux         — UI/UX audits, design decisions
  - domain:meta       — docs about docs, standards

  ═══════════════════════════════════════════
  PHASE 2: TRANSLATE 19 ENGLISH FILES TO UKRAINIAN
  ═══════════════════════════════════════════

  Files to translate (DO NOT change file names, only content):
    docs/agents/agy/00-bootstrap/SKILL.md
    docs/agents/agy/01-docs-agent/SKILL.md
    docs/agents/agy/02-repo-analyzer/SKILL.md
    docs/agents/agy/03-dataview-dql/SKILL.md
    docs/agents/agy/README.md
    docs/concept/07-agent-dev-workflow.md
    docs/plans/2026-05-12-multi-agent-drakon-system.md
    docs/plans/2026-05-12-platform-redesign-proposal.md
    docs/plans/2026-05-15-langgraph-pipeline.md
    docs/plans/2026-05-16-js-ts-support.md
    docs/plans/2026-05-16-sprint5-pipeline-mgmt.md
    docs/plans/2026-05-21-ir-scheme-bidirectional-import.md
    docs/plans/Multi-Agent DRAKON System Plan.md
    docs/templates/lovable-migration/lovable-prompts/00-safe-migration-init.md
    docs/ux-audit/audit.md
    docs/ux-audit/lovable-prompt-27.md
    docs/ux-audit/risks.md
    docs/ux-audit/stitch-prompt-agent-studio.md
    docs/ux-audit/stitch-prompt.md

  Translation rules:
    - Translate all prose to Ukrainian
    - Keep code blocks, commands, variable names in English
    - Keep technical terms: DRAKON, LangGraph, pipeline, agent, markdown, etc.
    - Keep file paths and URLs unchanged
    - Add proper frontmatter after translation

  ═══════════════════════════════════════════
  PHASE 3: REFORMAT ALL FILES (add frontmatter + semantic links)
  ═══════════════════════════════════════════

  Process ALL 57 .md files:
  1. Add/update YAML frontmatter (domain, status, format, tier, title, lang, created, updated)
  2. Add "## Семантичні зв'язки" section at end with relevant [[wikilinks]]
  3. Cross-link related files (e.g., concept/01-vision → [[02-drakon-primer]], [[03-architecture]])

  Priority cross-links to add:
    concept/ files → link to each other sequentially [[01-vision]]...[[08-agent-docs-integration]]
    architecture/ → link to relevant concept/ and kb/ files
    manuals/ → link to architecture/ and kb/ files
    plans/ → link to relevant concept/ files
    kb/ → link to architecture/ and concept/

  ═══════════════════════════════════════════
  PHASE 4: CREATE _INDEX.md FOR EACH FOLDER
  ═══════════════════════════════════════════

  Create _INDEX.md in each folder using Garden table format:

  Template:
  ---
  tags: [domain:meta, status:canonical, format:index]
  created: 2026-05-28
  updated: 2026-05-28
  tier: 1
  title: "НАЗВА РОЗДІЛУ — Індекс"
  lang: uk
  ---
  # НАЗВА РОЗДІЛУ

  > Короткий опис розділу

  | Файл | Опис | Статус | Tier |
  |------|------|--------|------|
  | [[назва-файлу]] | Що описує | canonical | 1 |

  ## Семантичні зв'язки
  **Батьківський індекс:** [[docs/INDEX]]

  Folders to create _INDEX.md:
    docs/concept/_INDEX.md
    docs/architecture/_INDEX.md
    docs/kb/_INDEX.md
    docs/manuals/_INDEX.md
    docs/plans/_INDEX.md
    docs/reports/_INDEX.md
    docs/agents/_INDEX.md
    docs/agents/agy/_INDEX.md
    docs/ux-audit/_INDEX.md
    docs/META/_INDEX.md

  ═══════════════════════════════════════════
  PHASE 5: UPDATE MAIN docs/INDEX.md
  ═══════════════════════════════════════════

  Rewrite docs/INDEX.md as the canonical entry point:
  - Wiki-link to all _INDEX.md files
  - Table of sections with descriptions
  - Status summary (how many files per domain/status)
  - Reading paths for different roles (developer, architect, newcomer)

  ═══════════════════════════════════════════
  EXECUTION STRATEGY (важливо — файлів багато)
  ═══════════════════════════════════════════

  Process in batches to avoid quota issues:
  BATCH 1: PHASE 1 (STANDARD.md) + concept/ folder (9 files)
  BATCH 2: architecture/ + kb/ folders (7 files)
  BATCH 3: manuals/ + agents/ folders (10 files)
  BATCH 4: plans/ English files translation (6 files)
  BATCH 5: ux-audit/ + reports/ folders (8 files)
  BATCH 6: All _INDEX.md creation + main INDEX.md update

  After each batch: git add docs/ && git commit -m "docs(standard): batch N — ..." && git push

  ═══════════════════════════════════════════
  FINAL STEPS
  ═══════════════════════════════════════════

  git add docs/
  git commit -m "docs(standardization): translate EN→UA + Garden formatting standard + wiki structure"
  git push origin main

  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-28|TASK-12:docs-standardization|
    TRANSLATED:<N>.files|REFORMATTED:<N>.files|INDEXES:<N>.created|
    STANDARD:docs/META/STANDARD.md|COMMIT:<hash>|★★★"
```

### TASK-13: Оновити DOCS_SYSTEM_PROMPT — Garden Bloom стандарт
```
[x] TASK-13 — ВИКОНАНО Claude (AGY quota) 2026-05-28
  Файл: /home/vokov/workspace/drakon-flow-90aa2999/services/docs-agent/prompts.py
  Дія: DOCS_SYSTEM_PROMPT розширено інструкціями Garden Bloom стандарту:
    - YAML frontmatter шаблон (domain/status/format/tier/lang)
    - Доменна таксономія (9 доменів)
    - Рівні tier (1=canonical, 2=active, 3=reference)
    - Wikilinks [[назва-файлу]]
    - Секція "## Семантичні зв'язки" (обов'язкова для кожного документу)
  Сервіс перезапущено: sudo rc-service ai-docs-agent restart → OK
  Commit: f1fca78 (drakon-flow-90aa2999/main)
```


### TASK-14: AGY2 (ноутбук) — авторизація та конфігурація
```
[x] TASK-14
  Хост: 192.168.3.30 (Windows laptop)
  SSH: vokov@192.168.3.30 пароль 0523 (port 22)
  Proxy: agy2.exodus.pp.ua LIVE (cloudflared OrangePi)
  Node.js proxy: C:/Users/vokov/Documents/GitHub/antigravity-claude-proxy/

  КРОК 1: Перевір чи proxy вже запущений та авторизований
    curl -s http://192.168.3.30:8080/health
    якщо accounts > 0: ПЕРЕХОДЬ до КРОКУ 4
    якщо 0 або connection refused: КРОК 2

  КРОК 2: Запусти proxy через SSH до Windows
    ssh vokov@192.168.3.30 'tasklist | findstr node'
    якщо node.exe не запущений:
      ssh vokov@192.168.3.30 'powershell -WindowStyle Hidden -Command "Start-Process node -ArgumentList C:/Users/vokov/Documents/GitHub/antigravity-claude-proxy/src/index.js -WindowStyle Hidden"'
      sleep 4
      curl -s http://192.168.3.30:8080/health

  КРОК 3: Отримай OAuth URL
    curl -sv http://192.168.3.30:8080/ 2>&1 | grep -i 'location\|oauth\|google' | head -5
    REPORT_TO_Q: "Відкрий на ноутбуці: <URL>" і чекай підтвердження

  КРОК 4: Перевір через зовнішній тунель
    curl -s https://agy2.exodus.pp.ua/health
    curl -s https://agy2.exodus.pp.ua/v1/models

  КРОК 5: Зареєструй в ai-memory
    curl -X POST "http://192.168.3.184:49374/hook?event=SessionStart" \
      -H "Content-Type: application/json" \
      -d '{"session_id":"agy2-setup-2026-05-28","cwd":"/agy2"}'

  КРОК 6: Оновити TASKS.md і diary
    sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.195 'cd ~/workspace/ai-drakon-scaffolder && sed -i "s/^\[ \] TASK-14/[x] TASK-14/" development/TASKS.md && git add development/TASKS.md && git commit -m "chore(tasks): TASK-14 AGY2 laptop authorized" && git push origin main'
    python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-28|TASK-14:agy2-setup|DONE|★★"
```


### TASK-15: AGY3 (планшет) — фінальне налаштування
```
[x] TASK-15 — ВИКОНАНО 2026-05-28
  AGY3 планшет: 192.168.3.162, SSH u0_a410/TermuxSsh2026!
  Proxy: https://agy3.exodus.pp.ua LIVE
  Акаунт: arsen.k111999@gmail.com (100% quota)
  MemPalace: 13017 drawers (перенесено з телефону)
  Моделі: gemini-2.5-pro, gemini-2.5-flash, claude-sonnet-4-6, claude-opus-4-6-thinking
  Автозапуск: termux-services (sv status agy-proxy: run)
  Наступний крок: встановити AGY CLI на планшет
```

### TASK-17: Налаштування ai-memory хуків на планшеті
```
[x] TASK-17 — ВИКОНАНО 2026-05-28
  Налаштовано скрипти автозапуску та зупинки ai-memory хуків на планшеті.
  Скрипти: ~/bin/ai-memory-start.sh, ~/bin/ai-memory-end.sh
  Автозапуск: додано до ~/.termux/boot/start-agy-proxy.sh
```

---

## SPRINT 2026-05-29

### TASK-19: Обрізка wiki-лінків у всіх docs/ до max 4 (link budget)

```
[x] TASK-19 — виконано Claude 2026-05-29

МЕТА: Привести всі існуючі docs/*.md у відповідність до нових правил щільності лінків
(LINKS_RESEARCH.md + docs/META/STANDARD.md).

ПРАВИЛО (жорстке):
  Секція "## Семантичні зв'язки" в кожному документі — max 4 лінки:
  1. [[ПАПКА/_INDEX]] — батьківський індекс (обов'язково, 1 шт)
  2. [[суміжний-1]] — лише якщо критично необхідний (0-2 шт)
  3. [[читати-далі]] — наступний логічний крок (0-1 шт)
  Лінки в тілі документу — тільки для API/модулів, не для концептів.

ФАЙЛИ для виправлення (>4 лінків зараз):
  docs/META/STANDARD.md                               (10 лінків → 4)
  docs/concept/08-agent-docs-integration.md           (8 → 4)
  docs/kb/01-drakon-ir-spec.md                        (7 → 4)
  docs/concept/04-pipelines.md                        (7 → 4)
  docs/concept/06-knowledge-base.md                   (6 → 4)
  docs/concept/05-human-agent-loop.md                 (6 → 4)
  docs/concept/03-architecture.md                     (6 → 4)
  docs/architecture/02_drakon_to_langgraph_mapping.md (6 → 4)
  docs/agents/agy/README.md                           (6 → 4)
  docs/agents/agy/04-pinchtab-tests/PINCHTAB-ACCESS.md (6 → 4)
  docs/agents/agy/04-pinchtab-tests/PHASE2-EXTENDED.md (6 → 4)
  docs/agents/agy/04-pinchtab-tests/PHASE2-EXECUTION.md (6 → 4)
  docs/manuals/manual-pipeline-b.md                   (5 → 4)
  docs/manuals/manual-pipeline-a.md                   (5 → 4)
  docs/kb/02-agent-prompts.md                         (5 → 4)
  docs/concept/README.md                              (5 → 4)
  docs/concept/07-agent-dev-workflow.md               (5 → 4)
  docs/concept/02-drakon-primer.md                    (5 → 4)
  docs/architecture/05_security_and_deployment.md     (5 → 4)
  docs/architecture/04_validation_and_errors.md       (5 → 4)
  docs/architecture/03_live_tracing_protocol.md       (5 → 4)
  docs/agents/agy/05-bugfix-agents-pipelines/SKILL.md (5 → 4)
  docs/agents/agy/04-pinchtab-tests/SKILL.md          (5 → 4)
  docs/agents/agy/03-dataview-dql/SKILL.md            (5 → 4)
  docs/agents/agy/02-repo-analyzer/SKILL.md           (5 → 4)
  docs/agents/agy/01-docs-agent/SKILL.md              (5 → 4)
  docs/agents/agy/00-bootstrap/SKILL.md               (5 → 4)

АЛГОРИТМ для кожного файлу:
  1. Прочитай секцію "## Семантичні зв'язки" (завжди в кінці файлу)
  2. Залиши батьківський [[ПАПКА/_INDEX]] — обов'язково
  3. З решти лінків залиш max 2 найкритичніших (ті що описують пряму залежність)
  4. Якщо є "Читати далі" — залиш якщо це логічний наступний крок, інакше видали
  5. Зайві лінки — видали повністю
  6. НЕ чіпай тіло документу (тільки секцію Семантичні зв'язки)

ВЕРИФІКАЦІЯ:
  cd ~/workspace/ai-drakon-scaffolder
  find docs -name "*.md" ! -name "_INDEX.md" ! -name "INDEX.md" | \
    xargs -I{} sh -c 'count=$(grep -o "\[\[" "{}" 2>/dev/null | wc -l); [ $count -gt 4 ] && echo "OVER: $count {}"'
  (має бути пустий вивід — жодного файлу з >4 лінків)

COMMIT:
  git add docs/
  git commit -m "docs(links): trim wiki-link budget to max 4 per document (TASK-19)"
  git push origin main

DIARY:
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-19:link-budget-trim|27.files.fixed|max4.per.doc|★★★"
```

---

### TASK-20: Дослідження та впровадження кращих практик структури wiki-графу

```
[x] TASK-20 — виконано Claude 2026-05-29

КОНТЕКСТ:
  Граф wiki-посилань у docs/ все ще "заплутаний" після TASK-19.
  Проблема: ми обмежили вихідні зв'язки (outgoing, max 4), але
  не контролюємо ВХІДНІ (incoming) — кілька вузлів стали перевантаженими хабами.
  Скріншоти до/після: docs/screenshot/Screenshot_20260528-*.png

═══════════════════════════════════════════════
ФАЗА 1: ДОСЛІДЖЕННЯ (web search + збереження)
═══════════════════════════════════════════════

1.1. Досліди онлайн кращий досвід по темі:
  - "knowledge graph wiki link density best practices"
  - "Obsidian vault graph structure MOC hub vs index"
  - "roam research graph density tidy knowledge base"
  - "zettelkasten link structure incoming outgoing balance"
  - "knowledge base graph hub spoke vs distributed pattern"

  Питання для пошуку:
  a) Скільки ВХІДНИХ посилань допустимо на один вузол?
  b) Що краще: MOC-хаби чи плоска структура?
  c) Як розрізнити "семантичний зв'язок" від "навігаційного"?
  d) Чи _INDEX.md мають отримувати посилання від усіх дочірніх?

1.2. Збережи знахідки у NotebookLM (drn-ai notebook):
  notebook_id = "6139067a-5776-4b29-8869-7c9f9aed475c"
  - Додай джерела або текстовий summary знахідок як нотатку

1.3. Запиши summary в MemPalace:
  python3 -m mempalace add --wing ai-drakon --room docs \
    title="wiki-graph-research-2026-05-29" \
    content="<знахідки з дослідження>"

═══════════════════════════════════════════════
ФАЗА 2: АНАЛІЗ поточного графу
═══════════════════════════════════════════════

2.1. Побудуй таблицю incoming-лінків:
  cd ~/workspace/ai-drakon-scaffolder
  python3 - << 'PYEOF'
import os, re, glob
from collections import defaultdict

repo = os.path.expanduser("~/workspace/ai-drakon-scaffolder")
files = glob.glob(os.path.join(repo, "docs/**/*.md"), recursive=True)

# Підрахунок incoming посилань на кожен файл
incoming = defaultdict(list)
for fpath in files:
    rel = os.path.relpath(fpath, repo)
    with open(fpath) as f:
        content = f.read()
    links = re.findall(r'\[\[([^\]]+)\]\]', content)
    for link in links:
        incoming[link].append(rel)

# Сортування: хто найбільше отримує посилань
print("=== TOP INCOMING HUBS ===")
for target, sources in sorted(incoming.items(), key=lambda x: -len(x[1]))[:20]:
    print(f"{len(sources):3d}  [[{target}]]")
PYEOF

2.2. Зафіксуй: які вузли є перевантаженими хабами (>5 incoming)?
  Записати у docs/screenshot/graph-analysis-2026-05-29.md

═══════════════════════════════════════════════
ФАЗА 3: ВПРОВАДЖЕННЯ нових правил
═══════════════════════════════════════════════

На основі фаз 1+2 оновити три файли:

3.1. development/LINKS_RESEARCH.md — додати секцію:
  ## 4. Правила управління ВХІДНИМИ зв'язками
  <нові правила з дослідження>
  Максимум incoming для звичайного документа: <N>
  Максимум incoming для _INDEX: <N>
  Стратегія: <що обрали — MOC / flat / ієрархія>

3.2. docs/META/STANDARD.md — оновити секцію "Вікі-посилання":
  Додати підсекцію "Контроль вхідних зв'язків" з нових правил

3.3. services/docs-agent/prompts.py — оновити DOCS_SYSTEM_PROMPT:
  Додати до "Правил" нові обмеження на incoming-зв'язки:
  - Пояснення що _INDEX.md є навігаційним хабом — не перевантажувати прямими лінками
  - Якщо документ вже пов'язаний через _INDEX — не додавати прямий зв'язок до нього
  - Семантичний зв'язок = тільки якщо розуміння цільового документа критичне

3.4. Якщо є конкретні docs/ файли що посилаються надлишково на хаби — виправити.

ВЕРИФІКАЦІЯ:
  Перевір що prompts.py містить нові правила:
  grep -A5 "incoming\|вхідн" services/docs-agent/prompts.py

COMMIT:
  git add development/LINKS_RESEARCH.md docs/META/STANDARD.md \
         services/docs-agent/prompts.py docs/screenshot/
  git commit -m "docs(graph): research + implement incoming link control rules (TASK-20)"
  git push origin main

DIARY:
  Запиши в diary (agent: agt-ogy):
  "SESSION:2026-05-29|TASK-20:wiki-graph-research|incoming.rules.added|prompts.updated|★★★"
```

---

### TASK-21: Виправити incoming-лінки в docs/ за новими принципами

```
[x] TASK-21

ПРОБЛЕМА (дані аналізу):
  [[INDEX]] — 21 incoming (кожен doc лінкує на ROOT — НЕПРАВИЛЬНО)
  [[01-vision]] — 8 incoming (content-нода стала хабом)
  [[01-drakon-ir-spec]] — 8 incoming (те саме)
  [[03-architecture]] — 7 incoming

НОВІ ПРАВИЛА (з docs/META/STANDARD.md, LINKS_RESEARCH.md):
  - Лінкуй тільки на НАЙБЛИЖЧИЙ _INDEX свого розділу, НЕ на [[INDEX]] (root)
  - Якщо вже є [[concept/_INDEX]] — НЕ додавай окремо [[01-vision]], [[03-architecture]]
  - Content-нода: max 5 incoming

КРОК 1 — git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

КРОК 2 — замінити [[INDEX]] на правильний секційний _INDEX
  Запусти python3 скрипт:

  import os, re, glob

  SECTION_MAP = {
      "concept/": "concept/_INDEX",
      "architecture/": "architecture/_INDEX",
      "plans/": "plans/_INDEX",
      "kb/": "kb/_INDEX",
      "manuals/": "manuals/_INDEX",
      "agents/agy/": "agents/agy/_INDEX",
      "agents/": "agents/_INDEX",
      "ux-audit/": "ux-audit/_INDEX",
      "reports/": "reports/_INDEX",
      "templates/": "templates/_INDEX",
      "META/": "META/_INDEX",
  }

  files = glob.glob("docs/**/*.md", recursive=True)
  fixed = []
  for fpath in files:
      rel = os.path.relpath(fpath, ".")
      with open(fpath) as f:
          content = f.read()

      # Знайти секцію Семантичні зв'язки
      section_match = re.search(r"(## Семантичні зв[^\n]*\n)(.*?)$", content, re.DOTALL)
      if not section_match:
          continue

      section = section_match.group(2)
      original = section

      # Визначити правильний _INDEX для цього файлу
      correct_index = None
      for prefix, index in SECTION_MAP.items():
          if prefix in rel:
              correct_index = index
              break

      if correct_index:
          # Замінити [[INDEX]] на правильний секційний _INDEX
          section = re.sub(r'\[\[INDEX\]\]', f'[[{correct_index}]]', section)
          # Видалити дублюючий лінк якщо і sectional _INDEX і root INDEX були
          lines = section.split('\n')
          seen_links = set()
          new_lines = []
          for line in lines:
              links_in_line = re.findall(r'\[\[([^\]]+)\]\]', line)
              if links_in_line:
                  link = links_in_line[0]
                  if link in seen_links:
                      continue  # пропустити дублікат
                  seen_links.add(link)
              new_lines.append(line)
          section = '\n'.join(new_lines)

      if section != original:
          new_content = content[:section_match.start(2)] + section
          with open(fpath, 'w') as f:
              f.write(new_content)
          fixed.append(rel)
          print(f"FIXED: {rel}")

  print(f"Total fixed: {len(fixed)}")

КРОК 3 — додатково: якщо в секції вже є [[concept/_INDEX]], видали прямі лінки
  на [[01-vision]], [[03-architecture]], [[02-drakon-primer]] з тієї ж секції
  (вони вже доступні через _INDEX за 1 крок — надлишок)
  Залиш їх ТІЛЬКИ якщо вони єдиний зв'язок у секції.

ВЕРИФІКАЦІЯ:
  python3 -c "
  import re, glob
  from collections import defaultdict
  files = glob.glob('docs/**/*.md', recursive=True)
  incoming = defaultdict(list)
  for f in files:
      for link in re.findall(r'\[\[([^\]]+)\]\]', open(f).read()):
          incoming[link].append(f)
  hubs = [(t,s) for t,s in incoming.items() if len(s)>5 and '_INDEX' not in t and 'INDEX' not in t and 'README' not in t]
  print('Content hubs >5:', hubs[:10])
  idx = incoming.get('INDEX', [])
  print('[[INDEX]] incoming:', len(idx))
  "
  (Ціль: [[INDEX]] incoming → 0-2, content hubs → немає з >5)

COMMIT:
  git add docs/
  git commit -m "docs(graph): fix incoming links — nearest _INDEX, remove [[INDEX]] root refs (TASK-21)"
  git push origin main

DIARY:
  "SESSION:2026-05-29|TASK-21:incoming-links-fixed|INDEX.root.removed|★★★"
```

---

### TASK-22: Відновити 3 лінки на doc (parent + 2 related)

```
[x] TASK-22

КОНТЕКСТ:
  Після агресивного обрізання (TASK-21 cleanup) більшість docs мають лише 1 лінк.
  Граф виглядає як "кульбаба" — листки висять на хабах без зв'язків між собою.
  Треба відновити до 3 лінків: parent _INDEX (обов'язково) + 2 related (осмислені).

ПРАВИЛА відновлення:
  - parent _INDEX — завжди перший (вже є)
  - related-1 — документ з того самого розділу що логічно пов'язаний по темі
  - related-2 — документ з іншого розділу якщо є ПРЯМА залежність (не просто "схожа тема")
  - НЕ додавати [[INDEX]] (root) і не дублювати вже наявні лінки

АЛГОРИТМ для кожного файлу:
  1. Прочитай файл — визначи його тему/домен
  2. Подивись на сусідів у тому ж розділі — який найбільш пов'язаний?
  3. Чи є critical cross-domain залежність? (наприклад concept/ → architecture/)
  4. Додай 1-2 осмислених лінки в секцію ## Семантичні зв'язки

ПРІОРИТЕТ розділів для related:
  concept/ → пов'язані concept/ файли (01-vision↔02-drakon-primer↔03-architecture)
  architecture/ → kb/01-drakon-ir-spec (специфікація), concept/03-architecture
  kb/ → architecture/, concept/
  plans/ → пов'язані plans/ (той самий тип/спринт)
  agents/agy/ → наступний/попередній SKILL в серії
  manuals/ → пов'язані manuals/ або plans/

ВЕРИФІКАЦІЯ:
  find docs -name "*.md" ! -name "_INDEX.md" ! -name "INDEX.md" | \
    xargs -I{} python3 -c "
  import re, sys
  c = open('{}').read()
  n = len(re.findall(r'\[\[', c))
  if n < 2: print(f'UNDER: {n} [[  {}')
  " 2>/dev/null
  (має бути пусто — жоден файл не має < 2 лінків)

  Загальна кількість ребер після:
  python3 -c "import re,glob; print(sum(len(re.findall(r'\[\[',open(f).read())) for f in glob.glob('docs/**/*.md',recursive=True)))"
  (ціль: 250-280 ребер)

COMMIT:
  git add docs/
  git commit -m "docs(graph): restore 3 links per doc — parent + 2 meaningful related (TASK-22)"
  git push origin main

DIARY:
  "SESSION:2026-05-29|TASK-22:3-links-restored|graph.balanced|★★★"
```

---

### TASK-23: Знайти та змінити layout графу в folder.pages.dev

```
[x] TASK-23

КОНТЕКСТ:
  folder.pages.dev — CF Pages проект що читає docs/ з maxfraieho/ai-drakon-scaffolder.
  Показує граф wiki-посилань. Зараз використовує force-directed layout — все збивається
  в центральний клубок через хаби (_INDEX файли з 10+ incoming).
  Треба змінити на hierarchical або radial layout.

КРОК 1: Знайти конфіг folder.pages.dev
  a) Перевір GitHub акаунти: gh repo list maxfraieho --limit 20
  b) Шукай репо з назвою "folder", "garden", "wiki", "graph", "obsidian"
  c) Або: шукай в ai-drakon-scaffolder де є config для graph viewer:
     find . -name "*.json" -o -name "*.yaml" -o -name "*.toml" | \
       xargs grep -l "force\|d3\|cytoscape\|sigma\|graph" 2>/dev/null

КРОК 2: Якщо знайдено graph config — змінити layout
  Для D3 force-directed → radial/hierarchical:
    Шукай: "simulation", "forceLink", "forceManyBody", "forceCenter"
    Замінити на: d3.tree() або d3.cluster() або збільшити charge/repulsion

  Для Cytoscape.js:
    layout: { name: 'breadthfirst' } або { name: 'cose', nodeRepulsion: 8000 }

  Для Obsidian-compatible viewer (наприклад Quartz, Foam, Digital Garden):
    Шукай graph.config або graphConfig в quartz.config.ts / .env

КРОК 3: Якщо репо не знайдено
  Повідом в diary що folder.pages.dev source не знайдено:
  "SESSION:2026-05-29|TASK-23:source-not-found|manual-search-needed|★★"

COMMIT (якщо зміни є):
  git add . && git commit -m "feat(graph): switch layout to hierarchical/radial (TASK-23)"
  git push origin main

DIARY:
  "SESSION:2026-05-29|TASK-23:layout-changed-OR-not-found|★★★"
```

---

## SPRINT 2026-05-29 — Методологія синхронізації

### TASK-24: Збагатити AGY Stop hook — descriptive diary summary

```
[x] TASK-24

МЕТА: Поточний ai-memory-end.sh відправляє порожній stop event.
      Треба щоб при кожному завершенні AGY автоматично записував
      короткий summary в MemPalace diary.

ФАЙЛ для зміни: ~/bin/ai-memory-end.sh

ПОТОЧНИЙ ВМІСТ (приблизно):
  curl -sf -X POST http://192.168.3.184:49374/hook?event=Stop ...
  echo "ai-memory: session stopped"

НОВИЙ ВМІСТ — замінити на:
```bash
#!/data/data/com.termux/files/usr/bin/bash
SESSION_ID="${1:-agt-ogy-$(date +%Y%m%d)}"
SUMMARY="${2:-session ended}"

# ai-memory stop event
curl -sf -X POST "http://192.168.3.184:49374/hook?event=Stop" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"\",\"summary\":\"\",\"agent\":\"agt-ogy\"}" \
  --max-time 3 > /dev/null 2>&1

echo "ai-memory: session stopped [$SESSION_ID]"
```

ВЕРИФІКАЦІЯ:
  ~/bin/ai-memory-end.sh "test-session" "test summary"
  → має вивести: ai-memory: session stopped [test-session]

DIARY:
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-24:ai-memory-end-enriched|DONE|★★"
```

---

### TASK-25: MemPalace post-commit hook на dev server (192.168.3.184)

```
[x] TASK-25 — ВИРІШЕНО ІНАКШЕ (2026-05-29)

МЕТА: AGY має post-commit hook в Termux що автоматично mine MemPalace
      після кожного коміту. Але Claude на OrangePi читає MemPalace
      сервер на 192.168.3.184 — де auto-mine НЕ налаштовано.
      Результат: Claude бачить застарілий індекс після комітів AGY.

РІШЕННЯ: Додати post-commit hook в .git/hooks/ на dev server репо.

КРОКИ:

КРОК 1: Перевір чи hook вже є
  ls ~/workspace/ai-drakon-scaffolder/.git/hooks/post-commit 2>/dev/null \
    && echo "вже є" || echo "немає"

КРОК 2: Якщо немає — знайди шлях до mempalace
  which mempalace || python3 -m mempalace --help | head -2

КРОК 3: Створи hook
  cat > ~/workspace/ai-drakon-scaffolder/.git/hooks/post-commit << 'HOOKEOF'
#!/bin/sh
# Auto-mine MemPalace після кожного commit
REPO_PATH="/home/vokov/workspace/ai-drakon-scaffolder"
MP_CMD="python3 -m mempalace"
nohup $MP_CMD mine "$REPO_PATH" --wing ai_drakon_scaffolder > /dev/null 2>&1 &
HOOKEOF
  chmod +x ~/workspace/ai-drakon-scaffolder/.git/hooks/post-commit

КРОК 4: Тест
  cd ~/workspace/ai-drakon-scaffolder
  git commit --allow-empty -m "test(hooks): verify post-commit mempalace mine"
  sleep 5
  python3 -m mempalace stats --wing ai_drakon_scaffolder | head -5
  → перевір що timestamp оновився

КРОК 5: git push якщо test-commit потрібен (або git reset HEAD~1 для відміни)

DIARY:
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-25:post-commit-hook-184|DONE|★★★"
```

---

### TASK-26: Sync SYNC_METHODOLOGY.md → NotebookLM drn-ai

```
[x] TASK-26

META: Add development/SYNC_METHODOLOGY.md to NotebookLM notebook drn-ai.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device.
Do NOT SSH to 192.168.3.184. Do NOT test MCP connections. Do NOT run test scripts.
mempalace is installed locally here — use it directly.

STEP 1: git pull (local)
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Read file
  cat development/SYNC_METHODOLOGY.md

STEP 3: Add to NotebookLM via MCP tool (agy has notebooklm MCP configured)
  notebook_id = "6139067a-5776-4b29-8869-7c9f9aed475c"
  title = "SYNC_METHODOLOGY 2026-05-29"
  content = (full content of development/SYNC_METHODOLOGY.md)

STEP 4: Write diary — run directly in Termux, NO SSH:
  python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-29|TASK-26:sync-methodology-nlm|DONE|***"

STEP 5: Mark done and push
  sed -i 's/^\[ \] TASK-26/[x] TASK-26/' development/TASKS.md
  git add development/TASKS.md
  git commit -m "chore(tasks): TASK-26 done — SYNC_METHODOLOGY added to drn-ai NLM"
  git push origin main
```



---

## SPRINT 2026-05-29B

### TASK-27: Agents default LLM -> AGY (drakon/docs/architect)

```
[x] TASK-27

META: drakon-agent, docs-agent, architect-agent currently default to NIM (openai-proxy).
      Switch default LLM to AGY (https://agy.exodus.pp.ua) for these agents.

FILES (sync BOTH copies):
  src/components/agents/AgentLlmCard.tsx
  .lovable/src/components/agents/AgentLlmCard.tsx

STEP 1: git pull origin main

STEP 2: Find readFromStorage(agentId) in AgentLlmCard.tsx
  Look for: localStorage.getItem(...) || "openai"  or  || ""
  Add AGY default logic:
    const isAgyAgent = agentId && (
      agentId.includes("drakon") || agentId.includes("docs") || agentId.includes("architect")
    );
    protocol: localStorage.getItem(key_protocol) as any || (isAgyAgent ? "agy" : "openai"),
    baseUrl: localStorage.getItem(key_url) || (isAgyAgent ? "https://agy.exodus.pp.ua" : ""),

STEP 3: Sync both copies:
  cp src/components/agents/AgentLlmCard.tsx .lovable/src/components/agents/AgentLlmCard.tsx

STEP 4:
  git add src/components/agents/AgentLlmCard.tsx .lovable/src/components/agents/AgentLlmCard.tsx
  git commit -m "feat(agents): default drakon/docs/architect to AGY LLM provider (TASK-27)"
  git push origin main

DIARY: python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-29|TASK-27:agents-agy-default|DONE|commit:<hash>|***"
```

---

### TASK-28: Fix activeProject reactivity (GitHub/Docs/Vector panels)

```
[ ] TASK-28

META: GitHubPanel, DocsPanel, VectorPanel do not reload data when activeProject changes.
      Switching projects has no effect on these panels.

STEP 1: git pull origin main

STEP 2: Find components that should react to activeProject:
  grep -rn "activeProject\|useProject" src/components/ --include="*.tsx" | grep -v "test" | head -30

STEP 3: For each panel component (GitHubPanel, DocsPanel, NotesPanel, VectorPanel):
  Check if useEffect has [activeProject] in dependency array.
  If useEffect(() => { fetchData() }, []) -- missing activeProject in deps.
  Fix: useEffect(() => { if (activeProject) fetchData(activeProject) }, [activeProject])

STEP 4: Find WorkspaceShell.tsx sidebar:
  grep -n "GitHubPanel\|sidebar" src/components/workspace/WorkspaceShell.tsx | head -10
  Ensure activeProject prop is passed down OR component uses useProject() hook directly.

STEP 5: Sync both copies:
  rsync -a --include="*.tsx" src/components/ .lovable/src/components/ 2>/dev/null || \
  find src/components -name "*.tsx" | while read f; do
    target=".lovable/$f"
    if [ -f "$target" ]; then cp "$f" "$target"; fi
  done

STEP 6:
  git add src/components/ .lovable/src/components/
  git commit -m "fix(workspace): fix activeProject reactivity in panels (TASK-28)"
  git push origin main

DIARY (!!run locally on THIS Termux device, NO SSH to 192.168.3.184!!):
  python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-29|TASK-28:activeProject-reactivity|DONE|commit:<hash>|***"
```

---

### TASK-29: AGY3 tablet setup (repo + agy-task.sh)

```
[ ] TASK-29

META: AGY3 tablet (192.168.3.162, arsen.k111999@gmail.com, 100% quota)
      has agy CLI but no repo or agy-task.sh for task delegation.

STEP 1: Check repo
  ls ~/workspace/ai-drakon-scaffolder 2>/dev/null && echo "exists" || echo "missing"

STEP 2: Clone if missing
  mkdir -p ~/workspace
  git clone https://github.com/maxfraieho/ai-drakon-scaffolder ~/workspace/ai-drakon-scaffolder

STEP 3: Create ~/bin/agy-task.sh
  mkdir -p ~/bin
  Write the script (same as on phone):
  #!/data/data/com.termux/files/usr/bin/bash
  REPO=~/workspace/ai-drakon-scaffolder
  TASK_ID="${1:-}"
  LOG=~/agy-task.log
  cd "$REPO"
  git pull origin main --quiet
  if [ -n "$TASK_ID" ]; then
    PROMPT="Execute $TASK_ID from development/TASKS.md in ~/workspace/ai-drakon-scaffolder. Read the task, execute all steps, git commit + push, write diary agt-ogy."
  else
    PENDING=$(grep -n "^\[ \]" development/TASKS.md | head -3 | awk -F: '{print $2}' | tr "\n" ", ")
    PROMPT="Execute first pending task from development/TASKS.md (lines: $PENDING). Read, execute, git commit + push, write diary agt-ogy."
  fi
  echo "$(date): Starting AGY task: ${TASK_ID:-auto}" >> "$LOG"
  agy --print "$PROMPT" --dangerously-skip-permissions 2>&1 | tee -a "$LOG" | tail -20
  echo "$(date): Done" >> "$LOG"

  chmod +x ~/bin/agy-task.sh

STEP 4: Test
  cd ~/workspace/ai-drakon-scaffolder && echo "repo ok" && agy --version

DIARY: python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-29|TASK-29:agy3-setup|DONE|***"
```
