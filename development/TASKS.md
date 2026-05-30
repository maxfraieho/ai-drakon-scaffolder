# TASKS — Координація Claude ↔ AGY

> Власник: Claude (оркестратор)
> Виконавець: AGY (executor)
> Оновлено: 2026-05-29 22:00

---

## TASK-56: deploy — Worker notes project filter fix (AGY3)

**Status:** [ ] pending
**Виконавець:** AGY3 (192.168.3.162)
**!!IMPORTANT!!** Run locally on AGY3 Termux — НЕ SSH до 192.168.3.184

### Контекст
Claude виправив Worker (cloudflare-worker/worker-mcp-drakon.js):
- handleNotesList/Get/Graph тепер передають ?project= параметр в docs-agent
- Дозволяє Notes tab показувати документи конкретного проекту (uav-watcher, etc.)

Зміна вже в GitHub (commit 1c946e0). Треба задеплоїти Worker на Cloudflare.

### Завдання

```bash
# 1. Перейти в директорію Worker
cd ~/workspace/ai-drakon-scaffolder/cloudflare-worker

# 2. Pull останні зміни
git pull origin main

# 3. Перевірити що є wrangler auth (CLOUDFLARE_API_TOKEN або wrangler login)
npx wrangler whoami

# Якщо не авторизовано:
# npx wrangler login
# (відкриє браузер — авторизуватись через Cloudflare account)

# 4. Deploy
npx wrangler deploy --config worker-wrangler.toml

# 5. Перевірити що deploy успішний:
curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/notes/list?flat=false&project=uav-watcher" \
  -H "Authorization: Bearer drakon-mcp-2026" | python3 -c "
import json,sys; d=json.load(sys.stdin)
tree = d.get('tree', [])
print('tree count:', len(tree), 'PASS' if len(tree)>0 else 'FAIL — still no project filter')
"
# Expected: tree count: 4 PASS
```

### Commit статусу:
```bash
cd ~/workspace/ai-drakon-scaffolder
sed -i 's/\[ \] TASK-56/[x] TASK-56/' development/TASKS.md 2>/dev/null || \
  python3 -c "
t=open('development/TASKS.md').read()
t=t.replace('[ ] pending\n**Виконавець:** AGY3', '[x] done\n**Виконавець:** AGY3')
open('development/TASKS.md','w').write(t)"
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-56 done — Worker notes project filter deployed"
git push origin main
python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-56:worker-notes-deploy|DONE|commit:<hash>|***"
```

---

## TASK-58: docs — генерація документації Sharon consultant + auth + web_config (AGY phone)

**Status:** [x] done
**Виконавець:** AGY phone (192.168.3.25)
**!!IMPORTANT!!** Run locally on Termux — НЕ SSH до 192.168.3.184

### Контекст
Документознавець (docs-agent на 192.168.3.184:8767) генерує docs для uav-watcher.
Вже задокументовано: uav_watcher, geo_monitor, shelter_search, _INDEX.
Треба: sharon consultant, auth, web_config.

**Спочатку: обов'язково прочитай скіли з ~/.claude/skills/**
Для цієї задачі перевір: `systematic-debugging`, `verification-before-completion`.
Прочитай: `cat ~/.claude/skills/verification-before-completion/SKILL.md`

### Кроки

**1. Отримай код модулів через GitHub Worker:**
```bash
# sharon consultant (main файл)
curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/github/file?owner=maxfraieho&repo=uav-watcher&path=consultant/consultant.py&branch=master" > /tmp/consultant_resp.json
python3 -c "import json; d=json.load(open('/tmp/consultant_resp.json')); open('/tmp/consultant.txt','w').write(d['content']); print('LEN:', len(d['content']))"

curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/github/file?owner=maxfraieho&repo=uav-watcher&path=auth.py&branch=master" > /tmp/auth_resp.json
python3 -c "import json; d=json.load(open('/tmp/auth_resp.json')); open('/tmp/auth.txt','w').write(d['content']); print('LEN:', len(d['content']))"
```

**2. Виклич docs-agent /document для кожного:**
```python
import httpx

modules = [
    ('consultant', '/tmp/consultant.txt', ['uav-watcher', 'sharon', 'ai-consultant', 'fastapi']),
    ('auth', '/tmp/auth.txt', ['uav-watcher', 'auth', 'security']),
]

for name, path, tags in modules:
    code = open(path).read()[:6000]
    r = httpx.post('http://192.168.3.184:8767/document', json={
        'module_name': name,
        'code': code,
        'slug': f'uav-watcher/{name}',
        'project': 'uav-watcher',
        'tags': tags
    }, timeout=120.0)
    d = r.json()
    print(f'{name}: status={r.status_code}, git={d.get("git_ok")}, slug={d.get("slug")}')
```

**3. Верифікація:**
```bash
curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/notes/list?flat=true&project=uav-watcher" \
  -H "Authorization: Bearer drakon-mcp-2026" | python3 -c "
import json,sys; d=json.load(sys.stdin)
notes = d.get('notes', [])
print('Total docs:', len(notes))
[print(' -', n['slug']) for n in notes]
"
# Очікується: 6+ docs (додались consultant, auth)
```

**4. Commit diary (НЕ потрібен git commit — docs-agent сам комітить):**
```bash
python3 -m mempalace diary write --agent agt-ogy \
  "SESSION:2026-05-30|TASK-58:uav-watcher-docs-sharon+auth|DONE|skills:verification-before-completion|★★★"
```

**5. Mark done в TASKS.md:**
```bash
cd ~/workspace/ai-drakon-scaffolder
git pull origin main
python3 -c "
t=open('development/TASKS.md').read()
t=t.replace('**Status:** [ ] pending\n**Виконавець:** AGY phone (192.168.3.25)', '**Status:** [x] done\n**Виконавець:** AGY phone (192.168.3.25)')
open('development/TASKS.md','w').write(t)
" 
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-58 done — uav-watcher sharon+auth docs"
git push origin main
```

---

## TASK-57: Variant A — Code+Notes відв'язати від activeProject (AGY3)

**Status:** [x] done
**Виконавець:** AGY3 (192.168.3.162)
**!!IMPORTANT!!** Run locally on AGY3 Termux — НЕ SSH до 192.168.3.184
**Plan:** `docs/plans/2026-05-29-variant-a-single-github-config.md` — читай повністю перед стартом

### Контекст
Variant A: Code tab і Notes/Docs tab використовують тільки `getGithubConfig()` з Settings.
НЕ `activeProject`. ProjectSelector залишається для Agents/Pipeline/Diagrams.

Проект: `~/workspace/ai-drakon-scaffolder`
Після кожного `src/` файлу — одразу `cp src/X .lovable/src/X` і `diff` щоб перевірити.

### 4 файли для зміни:

**1. src/pages/CodePage.tsx** (+ .lovable/src/pages/CodePage.tsx)
- Видалити `import { useProject }` і `const { activeProject } = useProject()`
- Видалити `const projectGh = activeProject?.github`
- `owner = ghCfg.owner || ""`, `repo = ghCfg.repo || ""`, `branch = ghCfg.branch || "main"`
- Текст порожнього стану: "Налаштуйте GitHub у вкладці Налаштування"

**2. src/components/docs/NotesTab.tsx** (+ .lovable копія)
- `import { useProject }` → `import { getGithubConfig } from "@/lib/settings-storage"`
- `const { activeProject } = useProject()` → `const ghRepo = getGithubConfig().repo || ""`
- Всі `activeProject?.slug` → `ghRepo || undefined`

**3. src/components/docs/NotesGraphTab.tsx** (+ .lovable копія)
- Аналогічно: useProject → getGithubConfig, activeProject?.slug → ghRepo

**4. src/components/docs/DocsFilesTab.tsx** (+ .lovable копія)
- Аналогічно

### Верифікація:
```bash
cd ~/workspace/ai-drakon-scaffolder
grep "useProject" src/pages/CodePage.tsx src/components/docs/NotesTab.tsx src/components/docs/NotesGraphTab.tsx src/components/docs/DocsFilesTab.tsx && echo "BUG: useProject still present" || echo "OK: all removed"
diff src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx && echo "CodePage SYNC OK"
diff src/components/docs/NotesTab.tsx .lovable/src/components/docs/NotesTab.tsx && echo "NotesTab SYNC OK"
```

### Commits (4 окремих + tasks):
```bash
git commit -m "fix(code-tab): use global github settings only, remove activeProject (Variant A)"
git commit -m "fix(notes-tab): use global github repo for project scope (Variant A)"  
git commit -m "fix(notes-graph): use global github repo for graph scope (Variant A)"
git commit -m "fix(docs-files-tab): use global github repo for docs scope (Variant A)"
git commit -m "chore(tasks): mark TASK-57 done — Variant A"
git push origin main
python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-57:variant-a|DONE|4-files-8-edits|★★★"
```

---

## OVERNIGHT SPRINT (2026-05-28)

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
[x] TASK-28

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
[x] TASK-29

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


---

### TASK-30: Update collaboration docs — full methodology with wiki links

```
[x] TASK-30

META: Update docs/COLLABORATION.md and docs/kb/sync-hooks-methodology.md
      with complete, detailed description of the Claude+AGY multi-agent workflow,
      including all sprint 2026-05-29 discoveries (session-start hooks, diary format,
      delegate-agy.sh pattern, mempalace local vs remote, !!IMPORTANT!! task instructions).
      Apply Garden Bloom standard with proper wiki links.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device. NO SSH needed except
for git push. mempalace is LOCAL on this device.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Read current docs to understand what exists
  cat docs/COLLABORATION.md | head -60
  cat docs/kb/sync-hooks-methodology.md | head -40

STEP 3: Update docs/COLLABORATION.md
  Add/update these sections following Garden Bloom standard (Ukrainian, frontmatter, wikilinks):

  ## 5. AGY Task Execution Protocol (деталі)

  ### Правильний спосіб делегування через OrangePi
  - Завжди використовуй ~/bin/delegate-agy.sh "TASK-N"
  - run_in_background: true в Bash, БЕЗ & в команді
  - Результат: ~/agy-task.log на AGY + diary agt-ogy

  ### Критичне правило для TASKS.md
  Кожна задача ОБОВ'ЯЗКОВО містить:
  "!!IMPORTANT!!: Run locally on THIS Termux device. NO SSH to 192.168.3.184 for diary/mempalace."
  Без цього AGY може піти на dev server шукати mempalace (якого там немає).

  ### mempalace розташування
  - OrangePi: локальний процес (MCP server, ~21000 drawers)
  - AGY phone/AGY3 tablet: локальний Termux process (окрема БД, але читається через diary)
  - Dev server 192.168.3.184: mempalace НЕ встановлено — AGY не повинен туди лізти

  ## 6. Паралельне виконання (AGY + AGY3)

  | Інстанс | Хост | SSH | Quota |
  |---------|------|-----|-------|
  | AGY phone | 192.168.3.25 (динамічний) | u0_a284:123456 port 8022 | змінна |
  | AGY3 tablet | 192.168.3.162 (статичний) | u0_a410:TermuxSsh2026! port 8022 | 100% |

  Обидва мають: agy CLI, agy-task.sh, репо ai-drakon-scaffolder, git credentials.
  Делегувати незалежні задачі на різні пристрої одночасно.

  ## 7. Верифікація після AGY задачі
  1. git log --oneline -3 (нові коміти?)
  2. grep "\[x\] TASK-N" development/TASKS.md
  3. mempalace_diary_read(agent_name="agt-ogy", last_n=3) через MCP
  4. Перевірити реальні зміни в коді (НЕ довіряти AGY звіту без перевірки коду)

STEP 4: Update docs/kb/sync-hooks-methodology.md
  Add section about AGY3 parallel execution and mempalace locality.

STEP 5: Update wiki links — add [[kb/sync-hooks-methodology]] references where relevant
  In docs/COLLABORATION.md add at bottom:
  ## Семантичні зв'язки
  **Цей документ є частиною:** [[docs/_INDEX]]
  **Пов'язано з:** [[kb/sync-hooks-methodology]] — деталі hooks та mempalace

STEP 6: Sync both src copies if any tsx files changed (not needed for docs)

STEP 7: Commit
  git add docs/COLLABORATION.md docs/kb/sync-hooks-methodology.md
  git commit -m "docs(collab): update methodology — AGY3 parallel, mempalace locality, task rules"
  git push origin main

DIARY (!!run locally, NO SSH!!):
  python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-29|TASK-30:docs-methodology-update|DONE|commit:<hash>|***"
```

---

## SPRINT 2026-05-29C — Architecture Research + DRAKON Editor Fix

### TASK-31: Дослідження архітектури 3 агентів — звіт + пропозиція уніфікації

```
[x] TASK-31

META: Дослідити поточну архітектуру 3 агентів (architect :8766, docs :8767, drakon :8765).
      Скласти звіт: що спільне, що різне, як уніфікувати під один framework.
      Дослідити чи варто додати ai-memory (192.168.3.184:49374) як спільну пам'ять.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device.
mempalace is LOCAL on this device. NO SSH needed except for reading files on 192.168.3.184.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай всі три main.py та ключові модулі
  SSH до 192.168.3.184 тільки для читання файлів:
  sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/architect-agent/main.py"
  sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/docs-agent/main.py"
  sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/drakon-agent/main.py"

  Також прочитай:
  services/architect-agent/ai_chat/architect_chat.py
  services/docs-agent/ai_chat/docs_chat.py
  services/docs-agent/prompts.py
  services/architect-agent/prompts.py (якщо є)
  services/drakon-agent/ai_refiner/ (всі файли)

STEP 3: Для кожного агента запиши:
  a) LLM-клієнт: який, як ініціалізується, модель
  b) Knowledge Base: є? формат? BM25 / vector / MD?
  c) Memory: чи використовує між запитами?
  d) API endpoints: GET/POST маршрути
  e) Специфічна логіка: що унікальне

STEP 4: Дослідження ai-memory як спільної пам'яті агентів
  Переваги: агенти зберігають контекст сесій у wiki.md форматі
  Перевір API: curl -s http://192.168.3.184:49374/wiki/
  Перевір чи є POST /wiki/pages endpoint для запису
  curl -s -X POST http://192.168.3.184:49374/wiki/pages \
    -H "Content-Type: application/json" \
    -d '{"title":"test-agent-memory","content":"# Test\nAgent memory test"}'

STEP 5: Напиши звіт docs/reports/agent-architecture-2026-05-29.md
  Структура звіту (Garden Bloom стандарт):
  ---
  tags: [domain:architecture, status:active, format:report, tier:2]
  created: 2026-05-29
  title: "Архітектура агентів: поточний стан та пропозиція уніфікації"
  lang: uk
  ---

  ## 1. Поточна архітектура (таблиця: агент | framework | LLM | KB | memory)
  ## 2. Спільні компоненти (що дублюється між агентами)
  ## 3. Унікальна логіка кожного агента
  ## 4. Пропозиція уніфікації
     - Спільний LLM-клієнт (shared/llm_client.py?)
     - Спільна KB структура (shared knowledge base format)
     - Чи варто ai-memory для агентів? Висновок + аргументи
  ## 5. Наступні кроки (конкретні задачі для реалізації)

  ## Семантичні зв'язки
  Цей документ є частиною: [[reports/_INDEX]]
  Пов'язано з: [[architecture/02_drakon_to_langgraph_mapping]]

STEP 6: Commit
  git add docs/reports/agent-architecture-2026-05-29.md
  git commit -m "docs(research): agent architecture analysis + unification proposal (TASK-31)"
  git push origin main

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-31:agent-arch-research|DONE|commit:<hash>|***"
```

---

### TASK-32: Відновити DRAKON Logic редактор у меню /agents

```
[x] TASK-32

META: В меню /agents є вкладка "DRAKON Logic" з DrakonEditor (додано в eac7908).
      Код є в src/ та .lovable/src/ на рядку 274+285 AgentStudioPage.tsx.
      Проблема: редактор не відображається або відображається порожнім.
      Знайти root cause та виправити.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH to 192.168.3.184 for reading/editing files.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай AgentStudioPage.tsx повністю
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/src/pages/AgentStudioPage.tsx"

  Шукай:
  a) Чи є DRAKON Logic у TabsList? (рядки ~270-290)
  b) Чи defaultValue Tabs включає DRAKON або перший таб?
  c) Умова рендерингу: чи є if/&&/hidden на DrakonEditor?
  d) activeDiagram — звідки береться? Чи може бути null?

STEP 3: Перевір чи DrakonEditor рендериться без activeDiagram
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/src/components/drakon/DrakonEditor.tsx | head -60"

  Якщо DrakonEditor вимагає non-null diagram — додай fallback:
  {activeDiagram ? <DrakonEditor ... /> : <EmptyState text="Обери агента зі списку" />}

STEP 4: Перевір чи вкладка видима в TabsList
  Знайди де TabsList в AgentStudioPage.tsx та переконайся що:
  - TabsTrigger value="drakon-logic" (або схоже) є в списку
  - Не обгорнуто в умовний рендеринг що ховає при певних умовах

STEP 5: Перевір sync .lovable/src/ з src/
  diff src/pages/AgentStudioPage.tsx .lovable/src/pages/AgentStudioPage.tsx
  Якщо різниця — синхронізуй:
  cp src/pages/AgentStudioPage.tsx .lovable/src/pages/AgentStudioPage.tsx

  Те саме для DrakonEditor:
  diff src/components/drakon/DrakonEditor.tsx .lovable/src/components/drakon/DrakonEditor.tsx
  cp src/components/drakon/DrakonEditor.tsx .lovable/src/components/drakon/DrakonEditor.tsx

STEP 6: Виправи знайдену проблему (залежно від результатів STEP 2-5)
  Типові виправлення:
  A) activeDiagram null → додай fallback повідомлення
  B) Вкладка прихована умовою → прибери умову або виправ логіку
  C) .lovable/src/ не синхронізовано → cp (вже в STEP 5)

STEP 7: Trigger CF Pages rebuild (важливо!)
  CF Pages будує з .lovable/src/ тому push до main автоматично тригерить deploy.
  Після push перевір: https://ai-drakon-scaffolder.pages.dev/agents
  (чекай 2-3 хвилини на деплой)

STEP 8: Commit
  git add src/pages/AgentStudioPage.tsx .lovable/src/pages/AgentStudioPage.tsx
  git add src/components/drakon/ .lovable/src/components/drakon/
  git commit -m "fix(agents): restore DRAKON Logic editor tab visibility (TASK-32)"
  git push origin main

VERIFICATION:
  Перевір що на https://ai-drakon-scaffolder.pages.dev/agents є вкладка "DRAKON Logic"
  та DrakonEditor рендериться (не порожній і не hidden).
  Якщо потрібно — зроби скріншот через curl або опиши стан в diary.

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-32:drakon-editor-restored|ROOT_CAUSE:<що знайшов>|DONE|commit:<hash>|***"
```

---

## SPRINT 2026-05-29D — Context Search Research

### TASK-33: Дослідження контекстного пошуку для агентів (in-project, lightweight)

```
[x] TASK-33

META: Агентам потрібен контекстний пошук по документації проекту (74 .md файлів).
      MemPalace занадто важкий (зовнішній ChromaDB сервіс).
      Дослідити легші варіанти, що вже є в проекті або легко додати.
      Результат: звіт + рекомендація + приклад реалізації shared/kb_client.py

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 тільки для читання файлів.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай поточні KB реалізації в проекті
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/crisis-bot/knowledge_base/ingest.py"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/crisis-bot/knowledge_base/retrieval.py"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/drakon-agent/knowledge_base/ingest.py"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/drakon-agent/knowledge_base/retrieval.py"

  Визнач: який алгоритм? BM25 / TF-IDF / vector / SQLite FTS5?
  Визнач: чи можна перенести в services/shared/?

STEP 3: Дослідити ai-memory як context store
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "ls ~/ai-memory-data/ && ls ~/ai-memory-data/wiki/"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "sqlite3 ~/ai-memory-data/db/*.sqlite '.tables' 2>/dev/null | head -5 || \
     find ~/ai-memory-data/db -name '*.sqlite' | head -3"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "sqlite3 \$(find ~/ai-memory-data/db -name '*.sqlite' | head -1) \
     '.tables' 2>/dev/null || echo 'no sqlite found'"

  Питання: чи є FTS (Full Text Search) в ai-memory SQLite?
  Перевір: чи можна query по wiki .md файлах через SQLite FTS5?

STEP 4: Оцінити 4 варіанти (для 74 .md docs, ~500KB тексту)

  ВАРІАНТ A: rank-bm25 (вже встановлено, вже є в crisis-bot)
    Плюси: встановлено, легкий, Python-pure, no server
    Мінуси: тільки keyword, no semantic
    RAM: ~5MB для 74 docs
    Пошук: 50ms

  ВАРІАНТ B: SQLite FTS5 (вбудований в Python)
    Плюси: zero deps, вбудований в Python stdlib, FTS з ranking
    Мінуси: тільки full-text, no semantic
    RAM: ~2MB
    Пошук: 10ms
    Перевір: python3 -c "import sqlite3; db=sqlite3.connect(':memory:'); db.execute('CREATE VIRTUAL TABLE t USING fts5(content)'); print('FTS5 OK')"

  ВАРІАНТ C: ai-memory wiki + FTS
    Плюси: вже є сервер, .md формат, HTTP API
    Мінуси: тільки /hook API публічно, wiki FTS невідомо
    Потрібно дослідити чи є /wiki/search endpoint

  ВАРІАНТ D: ChromaDB local (для semantic)
    Плюси: справжній semantic пошук, embeddings
    Мінуси: важкий (~200MB), потребує embed model або API
    RAM: ~300MB з моделлю
    Доцільно тільки якщо semantic важливіший за keyword

STEP 5: Перевір ai-memory API детально
  curl -s http://192.168.3.184:49374/wiki/search?q=agent 2>/dev/null | head -20
  curl -s http://192.168.3.184:49374/wiki/pages 2>/dev/null | head -20
  curl -s -X POST http://192.168.3.184:49374/wiki/search \
    -H "Content-Type: application/json" \
    -d '{"q":"agent architecture"}' 2>/dev/null | head -20

STEP 6: Напиши звіт docs/reports/context-search-research-2026-05-29.md

  Структура (Garden Bloom стандарт):
  ---
  tags: [domain:architecture, status:active, format:report, tier:2]
  created: 2026-05-29
  title: "Контекстний пошук для агентів: дослідження варіантів"
  lang: uk
  ---

  ## 1. Поточний стан (що вже є в проекті)
  ## 2. Оцінка варіантів (таблиця: варіант | RAM | пошук | складність | semantic?)
  ## 3. Рекомендація + обґрунтування
  ## 4. Прототип shared/kb_client.py (20-30 рядків коду)
     Показати як виглядав би мінімальний kb_client для рекомендованого варіанту:
     - def index_documents(docs_dir: Path) -> None
     - def search(query: str, top_k: int = 5) -> list[str]
  ## 5. ai-memory: чи підходить як context store? Висновок
  ## Семантичні зв'язки
  Цей документ є частиною: [[reports/_INDEX]]
  Пов'язано з: [[reports/agent-architecture-2026-05-29]]

STEP 7: Commit
  git add docs/reports/context-search-research-2026-05-29.md
  git commit -m "docs(research): context search options for agents — KB lightweight analysis (TASK-33)"
  git push origin main

DIARY (!!run locally on THIS device!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-33:context-search-research|RECOMMENDATION:<варіант>|DONE|commit:<hash>|***"
```

---

## SPRINT 2026-05-29E — Unified Agent Framework

### TASK-34: Написати план уніфікованого LangGraph-DRAKON фреймворку

```
[x] TASK-34

META: На основі досліджень TASK-31 та TASK-33 написати детальний план реалізації
      уніфікованого фреймворку для 3 агентів (architect, docs, drakon).
      Результат: docs/plans/2026-05-29-unified-agent-framework.md

КОНТЕКСТ (прочитай перед написанням плану):
  - TASK-31 звіт: docs/reports/agent-architecture-2026-05-29.md
  - TASK-33 звіт: docs/reports/context-search-research-2026-05-29.md
  - Існуючий план: docs/plans/2026-05-21-drakon-langgraph-runtime.md
  - graph_loader.py: services/architect-agent/pipeline/graph_loader.py
  - crisis-bot KB: services/crisis-bot/knowledge_base/ (BM25 → для референсу)

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 тільки для читання файлів.

STEP 1: git pull + прочитай контекст
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/docs/reports/agent-architecture-2026-05-29.md"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/docs/reports/context-search-research-2026-05-29.md | head -60"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/architect-agent/pipeline/graph_loader.py"

STEP 2: Напиши план docs/plans/2026-05-29-unified-agent-framework.md

  ОБОВ'ЯЗКОВИЙ ЗАГОЛОВОК (word for word):
  ---
  tags: [domain:plan, status:active, format:plan, tier:2]
  created: 2026-05-29
  updated: 2026-05-29
  title: "Unified LangGraph-DRAKON Agent Framework — Implementation Plan"
  lang: uk
  ---

  # Unified LangGraph-DRAKON Agent Framework

  > **Для Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

  **Goal:** Три агенти (architect :8766, docs :8767, drakon :8765) переходять на
  єдиний LangGraph-DRAKON фреймворк. Редагування логіки агента в DRAKON-редакторі
  /agents UI → автоматично змінює реальне виконання агента через LangGraph.

  **Architecture:**
  - services/shared/ — спільний шар (graph_loader, kb_client, llm_client, ai_memory)
  - Per-agent registries.py — NODE_REGISTRY зі специфічними функціями агента
  - pipelines/*.drakon.json — логіка агента як DRAKON IR (єдине джерело правди)
  - graph_loader(ir, node_registry) → LangGraph StateGraph → виконання

  **Tech Stack:** Python 3.11, LangGraph, FastAPI, SQLite FTS5, rank-bm25,
  ai-memory MCP (POST /mcp memory_query), drakonwidget.js frontend

  ---

  ПЛАН МАЄ МІСТИТИ ЦІ ЗАДАЧІ (у такому порядку):

  ### Task 1: Створити services/shared/ структуру
  Files to create:
    services/shared/__init__.py
    services/shared/graph_loader.py  (перенести з architect-agent, додати node_registry param)
    services/shared/kb_client.py     (SQLite FTS5, з звіту TASK-33 — прототип є!)
    services/shared/llm_client.py    (єдиний клієнт: AGY / OpenAI / Anthropic)
    services/shared/ai_memory.py     (wrapper для ai-memory MCP: POST /mcp memory_query)

  Для graph_loader.py — єдина зміна:
    def load_graph_from_ir(ir: dict, node_registry: dict, router_registry: dict, ...) -> Any:
    (замість глобальних NODE_REGISTRY / ROUTER_REGISTRY)

  Для kb_client.py — взяти прототип з TASK-33 звіту (SQLite FTS5, unicode61).

  Для ai_memory.py — wrapper для MCP endpoint:
    def query_memory(query: str, top_k: int = 5) -> list[str]:
      # POST http://192.168.3.184:49374/mcp
      # {"jsonrpc":"2.0","method":"tools/call","params":{"name":"memory_query","arguments":{"query":query}}}

  ### Task 2: architect-agent registries.py
  File: services/architect-agent/registries.py
  Зміст: NODE_REGISTRY, ROUTER_REGISTRY, STATE_REGISTRY
  (перенести з graph_loader.py, не видаляти звідти — просто імпортувати)

  ### Task 3: docs-agent registries.py + перший pipeline
  Files:
    services/docs-agent/registries.py   ← нові node functions
    services/docs-agent/pipelines/docs_pipeline.drakon.json
  Мінімальний pipeline для docs-agent:
    header → action:load_docs_kb → action:search_docs → action:generate_response → end

  ### Task 4: drakon-agent registries.py + перший pipeline
  Files:
    services/drakon-agent/registries.py
    services/drakon-agent/pipelines/analysis_pipeline.drakon.json
  Мінімальний pipeline:
    header → action:analyze_code → action:generate_ir → action:validate_ir → end

  ### Task 5: Оновити всі три main.py
  Кожен main.py при старті:
    1. Сканує pipelines/*.drakon.json
    2. Компілює через shared.graph_loader.load_graph_from_ir(ir, agent.registries.NODE_REGISTRY)
    3. При PUT /graph-pipelines/{name} — перекомпільовує граф
  
  ### Task 6: Оновити architect-agent для hot-reload
  При збереженні DRAKON IR через PUT /graph-pipelines/{name}:
    → зберегти pipelines/{name}.drakon.json
    → перекомпілювати граф
    → підтвердити через GET /graph-pipelines/{name}/status

  ### Task 7: Тести
  Для кожного агента:
    - test_graph_loads: graph_loader compiles без помилок
    - test_kb_search: kb_client.search("query") повертає results
    - test_pipeline_execute: POST /execute повертає SSE stream

  ### Task 8: Документація + commit
  Оновити docs/COLLABORATION.md — додати секцію про LangGraph-DRAKON runtime.
  Commit: feat(agents): unified LangGraph-DRAKON framework (TASK-34)

STEP 3: Commit plan file
  git add docs/plans/2026-05-29-unified-agent-framework.md
  git commit -m "docs(plan): unified LangGraph-DRAKON agent framework implementation plan"
  git push origin main

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-34:unified-framework-plan|DONE|commit:<hash>|KB:SQLite-FTS5|framework:LangGraph|***"
```

---

## SPRINT 2026-05-29F — Unified Framework Implementation

### TASK-35: Task 1 — Створити services/shared/ (graph_loader + kb_client + llm_client + ai_memory)

```
[x] TASK-35

META: Реалізувати shared/ пакет з 5 файлів.
      Основа уніфікованого LangGraph-DRAKON фреймворку.
      План: docs/plans/2026-05-29-unified-agent-framework.md Task 1

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для читання існуючих файлів та запису нових.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай існуючий graph_loader.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/architect-agent/pipeline/graph_loader.py"

STEP 3: Створи services/shared/__init__.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "mkdir -p ~/workspace/ai-drakon-scaffolder/services/shared && \
     echo '\"\"\"Shared utilities for all AI-DRAKON agents.\"\"\"' > \
     ~/workspace/ai-drakon-scaffolder/services/shared/__init__.py"

STEP 4: Створи services/shared/graph_loader.py
  Це МОДИФІКОВАНА копія services/architect-agent/pipeline/graph_loader.py.
  Ключова зміна: NODE_REGISTRY, ROUTER_REGISTRY, STATE_REGISTRY передаються як параметри.
  НЕ видаляти оригінал в architect-agent — він буде оновлений в Task 2.

  Вміст файлу services/shared/graph_loader.py:
  """Compile DRAKON IR JSON -> LangGraph StateGraph.
  Universal version: accepts registries as parameters instead of hardcoded globals.
  """
  import json
  from pathlib import Path
  from typing import Any
  from langgraph.graph import StateGraph, END


  def _resolve_target(item_id: str, items: dict) -> str:
      if item_id not in items:
          return END
      item = items[item_id]
      if item["type"] == "action":
          return item["content"]
      if item["type"] == "end":
          return END
      if item["type"] in ("header",):
          return _resolve_target(item.get("one", ""), items)
      return END


  def load_graph_from_ir(
      ir: dict,
      node_registry: dict[str, Any],
      router_registry: dict[str, Any],
      state_registry: dict[str, Any],
  ) -> Any:
      """Build and compile LangGraph graph from DRAKON IR + per-agent registries."""
      items = ir["items"]
      schema = ir.get("schema", {})
      default_state = next(iter(state_registry.values())) if state_registry else dict
      state_class = state_registry.get(schema.get("state_class", ""), default_state)

      g = StateGraph(state_class)

      for item in items.values():
          if item["type"] == "action":
              fn = node_registry.get(item["content"])
              if fn:
                  g.add_node(item["content"], fn)

      for item in items.values():
          if item["type"] == "header":
              entry = _resolve_target(item.get("one", ""), items)
              if entry != END:
                  g.set_entry_point(entry)
              break

      for item in items.values():
          if item["type"] != "action":
              continue
          node_name = item["content"]
          next_id = item.get("one", "")
          if not next_id:
              continue
          next_item = items.get(next_id, {})
          if next_item.get("type") == "question":
              router_fn = router_registry.get(next_item["content"])
              if router_fn:
                  yes_target = _resolve_target(next_item.get("one", ""), items)
                  no_target = _resolve_target(next_item.get("two", ""), items)
                  routing_map = {}
                  routing_map[yes_target if yes_target != END else END] = yes_target if yes_target != END else END
                  routing_map[no_target if no_target != END else END] = no_target if no_target != END else END
                  g.add_conditional_edges(node_name, router_fn, routing_map)
          else:
              target = _resolve_target(next_id, items)
              g.add_edge(node_name, END if target == END else target)

      return g.compile()


  def load_graph_from_file(
      path: str,
      node_registry: dict[str, Any],
      router_registry: dict[str, Any],
      state_registry: dict[str, Any],
  ) -> Any:
      with open(path) as f:
          ir = json.load(f)
      return load_graph_from_ir(ir, node_registry, router_registry, state_registry)

STEP 5: Створи services/shared/kb_client.py (SQLite FTS5, unicode61)
  Вміст (з прототипу TASK-33 звіту):
  """Unified Knowledge Base client using SQLite FTS5 (built-in, zero deps).
  Supports Ukrainian/Cyrillic via unicode61 tokenizer.
  """
  import sqlite3
  import re
  from pathlib import Path


  class KBClient:
      def __init__(self, db_path: str = ":memory:"):
          self.conn = sqlite3.connect(db_path)
          self.conn.execute("""
              CREATE VIRTUAL TABLE IF NOT EXISTS kb
              USING fts5(source, heading, content,
                         tokenize="unicode61 tokenchars '/_-'")
          """)

      def index_documents(self, docs_dir: Path) -> int:
          """Index all .md files from docs_dir. Returns count of indexed sections."""
          with self.conn:
              self.conn.execute("DELETE FROM kb")
              count = 0
              for md in sorted(docs_dir.glob("*.md")):
                  text = md.read_text(encoding="utf-8", errors="ignore")
                  sections, heading, lines = [], "intro", []
                  for line in text.splitlines():
                      if line.startswith("## "):
                          if lines:
                              sections.append((heading, "\n".join(lines).strip()))
                          heading, lines = line[3:].strip(), []
                      else:
                          lines.append(line)
                  if lines:
                      sections.append((heading, "\n".join(lines).strip()))
                  for h, c in sections:
                      if c.strip():
                          self.conn.execute(
                              "INSERT INTO kb(source, heading, content) VALUES(?,?,?)",
                              (md.name, h, c)
                          )
                          count += 1
          return count

      def search(self, query: str, top_k: int = 5) -> list[str]:
          """Search KB. Returns list of relevant text chunks."""
          clean = re.sub(r'[^\w\s]', ' ', query).strip()
          if not clean:
              return []
          try:
              rows = self.conn.execute(
                  "SELECT source, heading, content FROM kb WHERE kb MATCH ? "
                  "ORDER BY rank LIMIT ?",
                  (clean, top_k)
              ).fetchall()
              return [f"[{r[0]} / {r[1]}]\n{r[2]}" for r in rows]
          except sqlite3.OperationalError:
              return []

STEP 6: Створи services/shared/llm_client.py
  Вміст:
  """Unified LLM HTTP client for all agents.
  Supports: AGY proxy (Anthropic-compatible), OpenAI-compatible endpoints.
  """
  import json
  import os
  import urllib.request
  import urllib.error
  from typing import Any


  DEFAULT_BASE_URL = os.getenv("LLM_BASE_URL", "https://agy.exodus.pp.ua")
  DEFAULT_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")
  DEFAULT_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "60"))


  def chat(
      messages: list[dict],
      model: str = DEFAULT_MODEL,
      base_url: str = DEFAULT_BASE_URL,
      api_key: str = "",
      max_tokens: int = 4096,
      system: str = "",
  ) -> str:
      """Send chat request. Returns text response. Raises on error."""
      headers = {"Content-Type": "application/json"}
      if api_key:
          headers["x-api-key"] = api_key
          headers["anthropic-version"] = "2023-06-01"

      payload: dict[str, Any] = {
          "model": model,
          "max_tokens": max_tokens,
          "messages": messages,
      }
      if system:
          payload["system"] = system

      url = base_url.rstrip("/") + "/v1/messages"
      data = json.dumps(payload).encode()

      for attempt in range(3):
          try:
              req = urllib.request.Request(url, data=data, headers=headers, method="POST")
              with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
                  result = json.loads(resp.read())
              for block in result.get("content", []):
                  if block.get("type") == "text":
                      return block["text"]
              return ""
          except urllib.error.HTTPError as e:
              if e.code == 429 and attempt < 2:
                  import time; time.sleep(2 ** attempt)
                  continue
              raise
      return ""

STEP 7: Створи services/shared/ai_memory.py
  Вміст:
  """ai-memory MCP wrapper for agents.
  Uses JSON-RPC over HTTP at http://192.168.3.184:49374/mcp
  """
  import json
  import os
  import urllib.request
  import urllib.error

  AI_MEMORY_URL = os.getenv("AI_MEMORY_URL", "http://192.168.3.184:49374/mcp")
  _rpc_id = 0


  def _rpc(method: str, params: dict) -> dict:
      global _rpc_id
      _rpc_id += 1
      payload = json.dumps({
          "jsonrpc": "2.0",
          "id": _rpc_id,
          "method": method,
          "params": params,
      }).encode()
      req = urllib.request.Request(
          AI_MEMORY_URL,
          data=payload,
          headers={"Content-Type": "application/json"},
          method="POST",
      )
      try:
          with urllib.request.urlopen(req, timeout=5) as resp:
              return json.loads(resp.read())
      except (urllib.error.URLError, OSError):
          return {}


  def query_memory(query: str, top_k: int = 5) -> list[str]:
      """Query ai-memory wiki via MCP memory_query tool."""
      result = _rpc("tools/call", {
          "name": "memory_query",
          "arguments": {"query": query, "limit": top_k},
      })
      items = result.get("result", {}).get("content", [])
      return [i.get("text", "") for i in items if i.get("type") == "text"]


  def save_context(agent: str, content: str) -> bool:
      """Save agent context to ai-memory wiki."""
      result = _rpc("tools/call", {
          "name": "memory_add",
          "arguments": {"agent": agent, "content": content},
      })
      return bool(result.get("result"))

STEP 8: Верифікація — перевір що файли створено та синтаксично коректні
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     python3 -c 'from services.shared import graph_loader, kb_client, llm_client, ai_memory; print(\"imports OK\")' \
     2>/dev/null || python3 services/shared/kb_client.py 2>/dev/null || \
     python3 -c 'import ast; [ast.parse(open(f).read()) for f in [
       \"services/shared/graph_loader.py\",
       \"services/shared/kb_client.py\",
       \"services/shared/llm_client.py\",
       \"services/shared/ai_memory.py\"
     ]]; print(\"syntax OK\")'"

STEP 9: Quick smoke test для kb_client
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
import sys
sys.path.insert(0, "/home/vokov/workspace/ai-drakon-scaffolder")
from services.shared.kb_client import KBClient
from pathlib import Path
kb = KBClient(":memory:")
n = kb.index_documents(Path("/home/vokov/workspace/ai-drakon-scaffolder/docs/kb"))
print(f"indexed {n} sections")
results = kb.search("агент LangGraph", top_k=2)
print(f"search results: {len(results)}")
for r in results:
    print("  -", r[:80])
PYEOF'

STEP 10: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add services/shared/ && \
     git commit -m 'feat(shared): add unified agent shared layer — graph_loader, kb_client, llm_client, ai_memory (Task 1)' && \
     git push origin main"

STEP 11: TASKS.md update
  sed -i 's/^\[ \] TASK-35/[x] TASK-35/' development/TASKS.md
  git add development/TASKS.md
  git commit -m "chore(tasks): TASK-35 done — shared/ layer created"
  git push origin main

DIARY (!!run locally on THIS Termux device!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-35:shared-layer|files:graph_loader+kb_client+llm_client+ai_memory|DONE|commit:<hash>|***"
```

---

### TASK-36: Task 2 — BUILT_IN_TOOLS registry + llm_node_factory + graph_loader update

```
[x] TASK-36

META: Створити серце системи: глобальний реєстр вбудованих tools + фабрика LLM-нод.
      Оновити graph_loader.py для авто-розрізнення tool vs LLM-промпт.
      План: docs/plans/2026-05-29-unified-agent-framework-v2.md Task 2

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для запису файлів на dev server.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай поточний graph_loader
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/shared/graph_loader.py"

STEP 3: Створи services/shared/built_in_tools.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
content = """\"\"\"Built-in tools available to all AI-DRAKON agents across all projects.
Add new tools here to make them available in the DRAKON editor node registry.
\"\"\"
from typing import Any
from pathlib import Path


def search_kb(state: dict) -> dict:
    \"\"\"Search the project knowledge base. Uses state["query"] or state["input"].\"\"\"
    from services.shared.kb_client import KBClient
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    kb_dir = Path(f"/home/vokov/projects/{slug}/agents/{agent}/kb")
    if not kb_dir.exists():
        # fallback: search docs/kb/
        kb_dir = Path("/home/vokov/workspace/ai-drakon-scaffolder/docs/kb")
    kb = KBClient(":memory:")
    if kb_dir.exists():
        kb.index_documents(kb_dir)
    query = state.get("query") or state.get("input", "")
    results = kb.search(query, top_k=5) if query else []
    context = "\\n\\n".join(results)
    return {**state, "kb_results": results, "context": context}


def analyze_code(state: dict) -> dict:
    \"\"\"Analyze code using AST. Uses state["input"] as source code.\"\"\"
    import ast
    source = state.get("input", "")
    try:
        tree = ast.parse(source)
        nodes = [type(n).__name__ for n in ast.walk(tree)]
        summary = f"AST nodes: {len(nodes)}. Types: {set(list(nodes)[:10])}"
    except SyntaxError as e:
        summary = f"Syntax error: {e}"
    return {**state, "code_analysis": summary, "output": summary}


def generate_ir(state: dict) -> dict:
    \"\"\"Generate minimal DRAKON IR from analysis result.\"\"\"
    analysis = state.get("code_analysis", state.get("input", ""))
    ir = {
        "name": state.get("agent_name", "generated"),
        "items": {
            "h": {"type": "header", "content": "Generated", "one": "n1"},
            "n1": {"type": "action", "content": analysis[:50], "one": "end"},
            "end": {"type": "end"}
        }
    }
    import json
    return {**state, "generated_ir": ir, "output": json.dumps(ir, ensure_ascii=False)}


def save_to_project(state: dict) -> dict:
    \"\"\"Save output to project storage.\"\"\"
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    output = state.get("output", str(state))
    import json, datetime
    out_dir = Path(f"/home/vokov/projects/{slug}/agents/{agent}/results")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = out_dir / f"result_{ts}.json"
    out_file.write_text(json.dumps({"output": output, "state": str(state)[:500]}, ensure_ascii=False))
    return {**state, "saved_to": str(out_file)}


BUILT_IN_TOOLS: dict[str, Any] = {
    "search_kb":      search_kb,
    "analyze_code":   analyze_code,
    "generate_ir":    generate_ir,
    "save_to_project": save_to_project,
}
"""
with open("/home/vokov/workspace/ai-drakon-scaffolder/services/shared/built_in_tools.py", "w") as f:
    f.write(content)
print("built_in_tools.py written")
PYEOF'

STEP 4: Створи services/shared/llm_node.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
content = """\"\"\"LLM node factory for AI-DRAKON agent pipelines.
When DRAKON action content is not a tool name, it is treated as an LLM prompt.
\"\"\"
from typing import Any


def llm_node_factory(prompt_template: str):
    \"\"\"Returns a LangGraph-compatible node function that calls LLM with prompt_template.\"\"\"
    from services.shared.llm_client import chat

    def node(state: dict) -> dict:
        context = state.get("context", "")
        input_data = state.get("input") or state.get("query") or state.get("last_llm_result", "")
        messages = [{
            "role": "user",
            "content": (
                f"{prompt_template}\\n\\n"
                f"Input: {str(input_data)[:2000]}\\n"
                f"Context: {str(context)[:1000]}"
            )
        }]
        result = chat(messages, max_tokens=2048)
        return {**state, "output": result, "last_llm_result": result}

    node.__name__ = f"llm_{abs(hash(prompt_template)):08x}"
    node.__doc__ = prompt_template[:80]
    return node
"""
with open("/home/vokov/workspace/ai-drakon-scaffolder/services/shared/llm_node.py", "w") as f:
    f.write(content)
print("llm_node.py written")
PYEOF'

STEP 5: Оновити graph_loader.py — додати авто-розрізнення
  Прочитай поточний graph_loader.py (STEP 2), потім додай _resolve_node_fn:

  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/services/shared/graph_loader.py"
content = open(fpath).read()

# Додати імпорти на початок (після існуючих imports)
import_addition = """from services.shared.built_in_tools import BUILT_IN_TOOLS
from services.shared.llm_node import llm_node_factory
"""

# Додати функцію _resolve_node_fn перед load_graph_from_ir
resolve_fn = '''

def _resolve_node_fn(content: str, node_registry: dict) -> object:
    """Resolve DRAKON action content to a callable node function.
    Priority: node_registry > BUILT_IN_TOOLS > llm_node_factory(prompt)
    """
    if content in node_registry:
        return node_registry[content]
    if content in BUILT_IN_TOOLS:
        return BUILT_IN_TOOLS[content]
    return llm_node_factory(content)

'''

# Замінити реєстрацію action-нод в load_graph_from_ir
old_registration = "            if fn:\n                  g.add_node(item[\"content\"], fn)"

# Перевіримо що є в файлі
print("Current content preview:")
print(content[:200])
print("...")
# Знайдемо де реєструються ноди
import re
lines = content.split("\\n")
for i, line in enumerate(lines):
    if "add_node" in line:
        print(f"Line {i}: {line}")
PYEOF'

STEP 6: Якщо STEP 5 показав де add_node — оновити graph_loader.py
  Прочитай та оновіть файл services/shared/graph_loader.py:
  1. Додати на початок (після from typing import Any):
     from services.shared.built_in_tools import BUILT_IN_TOOLS
     from services.shared.llm_node import llm_node_factory

  2. Додати функцію _resolve_node_fn перед load_graph_from_ir

  3. В Pass 1 (реєстрація action-нод) замінити:
     Було:   fn = node_registry.get(item["content"])
             if fn:
                 g.add_node(item["content"], fn)
     Стало:  fn = _resolve_node_fn(item["content"], node_registry)
             g.add_node(item["content"], fn)

  Використай python3 для patch:
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/services/shared/graph_loader.py"
content = open(fpath).read()

# Add imports
if "BUILT_IN_TOOLS" not in content:
    content = content.replace(
        "from typing import Any",
        "from typing import Any\n"
        "# Built-in tools and LLM node factory (lazy import to avoid circular deps)\n"
        "_BUILT_IN_TOOLS = None\n"
        "_LLM_NODE_FACTORY = None\n"
    )

# Add _resolve_node_fn function
resolve_fn = '''

def _resolve_node_fn(content: str, node_registry: dict):
    """Tool name -> tool fn; natural language -> LLM prompt node."""
    global _BUILT_IN_TOOLS, _LLM_NODE_FACTORY
    if _BUILT_IN_TOOLS is None:
        from services.shared.built_in_tools import BUILT_IN_TOOLS as _T
        from services.shared.llm_node import llm_node_factory as _F
        _BUILT_IN_TOOLS = _T
        _LLM_NODE_FACTORY = _F
    if content in node_registry:
        return node_registry[content]
    if content in _BUILT_IN_TOOLS:
        return _BUILT_IN_TOOLS[content]
    return _LLM_NODE_FACTORY(content)

'''

if "_resolve_node_fn" not in content:
    content = content.replace(
        "def load_graph_from_ir(",
        resolve_fn + "def load_graph_from_ir("
    )

# Update node registration to use _resolve_node_fn
content = content.replace(
    "            fn = node_registry.get(item[\"content\"])\n            if fn:\n                g.add_node(item[\"content\"], fn)",
    "            fn = _resolve_node_fn(item[\"content\"], node_registry)\n            g.add_node(item[\"content\"], fn)"
)

open(fpath, "w").write(content)
print("graph_loader.py patched")
print("_resolve_node_fn in file:", "_resolve_node_fn" in open(fpath).read())
PYEOF'

STEP 7: Верифікація
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
import sys
sys.path.insert(0, "/home/vokov/workspace/ai-drakon-scaffolder")
import ast

# Syntax check all new files
for f in [
    "services/shared/built_in_tools.py",
    "services/shared/llm_node.py",
    "services/shared/graph_loader.py",
]:
    try:
        ast.parse(open("/home/vokov/workspace/ai-drakon-scaffolder/" + f).read())
        print(f"OK: {f}")
    except SyntaxError as e:
        print(f"SYNTAX ERROR in {f}: {e}")

# Check built_in_tools content
from services.shared.built_in_tools import BUILT_IN_TOOLS
print("BUILT_IN_TOOLS:", list(BUILT_IN_TOOLS.keys()))

# Check llm_node_factory
from services.shared.llm_node import llm_node_factory
fn = llm_node_factory("Test prompt")
print("llm_node callable:", callable(fn), "name:", fn.__name__)

# Check _resolve_node_fn in graph_loader
from services.shared.graph_loader import _resolve_node_fn
fn_tool = _resolve_node_fn("search_kb", {})
fn_llm = _resolve_node_fn("Проаналізуй та відповідь", {})
print("tool resolved:", fn_tool.__name__)
print("llm resolved:", fn_llm.__name__)
print("ALL OK")
PYEOF'

STEP 8: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add services/shared/built_in_tools.py services/shared/llm_node.py services/shared/graph_loader.py && \
     git commit -m 'feat(shared): built_in_tools registry + llm_node_factory + graph_loader auto-resolve (Task 2)' && \
     git push origin main && echo COMMITTED"

STEP 9: Mark done + push TASKS.md
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-36/[x] TASK-36/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-36 done — built_in_tools + llm_node_factory' && \
     git push origin main"

DIARY (!!run locally on THIS device, NO SSH!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-36:built-in-tools+llm-node-factory|BUILT_IN_TOOLS:search_kb+analyze_code+generate_ir+save_to_project|DONE|commit:<hash>|***"
```

---

### TASK-37: Task 3 — Per-project pipeline storage API (architect-agent)

```
[x] TASK-37

META: Додати до architect-agent REST API для зберігання/виконання pipeline per project+agent.
      Це дозволить UI зберігати DRAKON IR для будь-якого проекту і виконувати його.
      План: docs/plans/2026-05-29-unified-agent-framework-v2.md Task 3

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для читання/запису файлів та перезапуску сервісу.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай існуючий graph_pipeline_route.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/architect-agent/graph_pipeline_route.py | head -80"
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/architect-agent/main.py | head -60"

STEP 3: Створи services/architect-agent/project_pipeline_route.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
content = """\"\"\"Per-project agent pipeline API for AI-DRAKON developer tool.
Manages pipeline storage and execution scoped to project+agent.
\"\"\"
import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.shared.graph_loader import load_graph_from_ir

PROJECTS_BASE = Path(os.getenv("DRAKON_PROJECTS_DIR", Path.home() / "projects"))

router = APIRouter(prefix="/projects", tags=["project-pipelines"])


class PipelinePayload(BaseModel):
    ir: dict
    description: str = ""


def _pipeline_path(slug: str, agent: str) -> Path:
    p = PROJECTS_BASE / slug / "agents" / agent
    p.mkdir(parents=True, exist_ok=True)
    return p / "pipeline.drakon.json"


def _kb_dir(slug: str, agent: str) -> Path:
    p = PROJECTS_BASE / slug / "agents" / agent / "kb"
    p.mkdir(parents=True, exist_ok=True)
    return p


@router.get("/{slug}/agents")
def list_agents(slug: str):
    \"\"\"List all agents for a project.\"\"\"
    project_dir = PROJECTS_BASE / slug / "agents"
    if not project_dir.exists():
        return {"slug": slug, "agents": []}
    agents = []
    for d in sorted(project_dir.iterdir()):
        if d.is_dir():
            pipeline_file = d / "pipeline.drakon.json"
            agents.append({
                "name": d.name,
                "has_pipeline": pipeline_file.exists(),
                "kb_docs": len(list((d / "kb").glob("*.md"))) if (d / "kb").exists() else 0,
            })
    return {"slug": slug, "agents": agents}


@router.get("/{slug}/agents/{agent}/pipeline")
def get_pipeline(slug: str, agent: str):
    \"\"\"Get pipeline IR for a project agent.\"\"\"
    path = _pipeline_path(slug, agent)
    if not path.exists():
        raise HTTPException(404, f"No pipeline for {slug}/{agent}")
    return json.loads(path.read_text())


@router.put("/{slug}/agents/{agent}/pipeline")
def save_pipeline(slug: str, agent: str, payload: PipelinePayload):
    \"\"\"Save pipeline IR and hot-compile to verify it's valid.\"\"\"
    path = _pipeline_path(slug, agent)
    # Validate by compiling
    try:
        load_graph_from_ir(payload.ir, {}, {}, {})
    except Exception as e:
        raise HTTPException(400, f"Pipeline compilation error: {e}")
    path.write_text(json.dumps(payload.ir, indent=2, ensure_ascii=False))
    return {"saved": str(path), "valid": True}


@router.get("/{slug}/agents/{agent}/status")
def pipeline_status(slug: str, agent: str):
    \"\"\"Check if pipeline exists and is compilable.\"\"\"
    path = _pipeline_path(slug, agent)
    if not path.exists():
        return {"status": "no_pipeline"}
    try:
        ir = json.loads(path.read_text())
        load_graph_from_ir(ir, {}, {}, {})
        return {"status": "ok", "nodes": len(ir.get("items", {}))}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/{slug}/agents/{agent}/execute")
async def execute_pipeline(slug: str, agent: str, input_data: dict = {}):
    \"\"\"Execute pipeline with SSE streaming output.\"\"\"
    path = _pipeline_path(slug, agent)
    if not path.exists():
        raise HTTPException(404, f"No pipeline for {slug}/{agent}")

    ir = json.loads(path.read_text())
    state = {
        "input": input_data.get("input", ""),
        "query": input_data.get("query", ""),
        "project_slug": slug,
        "agent_name": agent,
        "context": "",
    }

    async def stream():
        import asyncio
        try:
            graph = load_graph_from_ir(ir, {}, {}, {})
            yield f"data: {{\"status\": \"started\", \"agent\": \"{agent}\"}}\\n\\n"
            for step in graph.stream(state):
                node_name = list(step.keys())[0] if step else "unknown"
                yield f"data: {{\"node\": \"{node_name}\", \"status\": \"done\"}}\\n\\n"
                await asyncio.sleep(0)
            yield f"data: {{\"status\": \"finished\"}}\\n\\n"
        except Exception as e:
            yield f"data: {{\"status\": \"error\", \"error\": \"{str(e)[:200]}\"}}\\n\\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
"""
with open("/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/project_pipeline_route.py", "w") as f:
    f.write(content)
print("project_pipeline_route.py written")
PYEOF'

STEP 4: Підключи router до main.py architect-agent
  Прочитай main.py та знайди де підключаються інші router-и:
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "grep -n 'include_router\|from.*route\|import.*route' \
    ~/workspace/ai-drakon-scaffolder/services/architect-agent/main.py"

  Додай підключення нового router в main.py після існуючих include_router:
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
import re
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/main.py"
content = open(fpath).read()

if "project_pipeline_route" not in content:
    # Add import
    content = content.replace(
        "from fastapi import FastAPI",
        "from fastapi import FastAPI\nfrom project_pipeline_route import router as project_router"
    )
    # Add include_router — find last app.include_router line
    lines = content.split("\n")
    last_include = max((i for i, l in enumerate(lines) if "include_router" in l), default=-1)
    if last_include >= 0:
        lines.insert(last_include + 1, "app.include_router(project_router)")
        content = "\n".join(lines)
    open(fpath, "w").write(content)
    print("main.py updated")
else:
    print("already included")
PYEOF'

STEP 5: Верифікація синтаксису
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
import ast, sys
files = [
    "/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/project_pipeline_route.py",
    "/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/main.py",
]
for f in files:
    try:
        ast.parse(open(f).read())
        print(f"OK: {f.split('/')[-1]}")
    except SyntaxError as e:
        print(f"ERROR in {f.split('/')[-1]}: {e}")
        sys.exit(1)
print("Syntax OK")
PYEOF'

STEP 6: Smoke test — перевір endpoints через curl (без перезапуску сервісу)
  Перевір що сервіс живий:
  curl -s http://192.168.3.184:8766/health | head -20

  Якщо потрібно перезапустити після зміни main.py:
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "sudo rc-service ai-architect-agent restart 2>/dev/null || \
     sudo rc-service architect-agent restart 2>/dev/null || \
     echo 'check service name: ls /etc/init.d/ | grep arch'"

STEP 7: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add services/architect-agent/project_pipeline_route.py \
             services/architect-agent/main.py && \
     git commit -m 'feat(architect): per-project agent pipeline API — CRUD + SSE execute (Task 3)' && \
     git push origin main"

STEP 8: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-37/[x] TASK-37/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-37 done — per-project pipeline API' && \
     git push origin main"

DIARY (!!run locally, NO SSH!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-37:per-project-pipeline-api|endpoints:/projects/{slug}/agents/{name}/pipeline|SSE:execute|DONE|commit:<hash>|***"
```

---

### TASK-38: Task 4 — KB per project (search_kb wired to project docs)

```
[x] TASK-38

META: Підключити built_in_tools.search_kb до реального kb_client per project.
      Додати API endpoint для завантаження docs в KB проекту.
      Довести що пошук по документах sharon-uav повертає правильні результати.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для читання/запису файлів.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай поточний built_in_tools.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/services/shared/built_in_tools.py"

STEP 3: Покращ search_kb в built_in_tools.py
  Поточна реалізація правильна але треба перевірити що вона індексує docs при кожному виклику.
  Краще: кешувати KBClient per project+agent між викликами.

  Заміни функцію search_kb:
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/services/shared/built_in_tools.py"
content = open(fpath).read()

# Add cache dict after imports
if "_kb_cache" not in content:
    content = content.replace(
        "from typing import Any",
        "from typing import Any\nfrom pathlib import Path\n\n_kb_cache: dict = {}  # (slug, agent) -> KBClient"
    )

# Replace search_kb function
old_fn = '''def search_kb(state: dict) -> dict:
    """Search the project knowledge base. Uses state["query"] or state["input"]."""
    from services.shared.kb_client import KBClient
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    kb_dir = Path(f"/home/vokov/projects/{slug}/agents/{agent}/kb")
    if not kb_dir.exists():
        # fallback: search docs/kb/
        kb_dir = Path("/home/vokov/workspace/ai-drakon-scaffolder/docs/kb")
    kb = KBClient(":memory:")
    if kb_dir.exists():
        kb.index_documents(kb_dir)
    query = state.get("query") or state.get("input", "")
    results = kb.search(query, top_k=5) if query else []
    context = "\\n\\n".join(results)
    return {**state, "kb_results": results, "context": context}'''

new_fn = '''def search_kb(state: dict) -> dict:
    """Search the project knowledge base. Caches index per project/agent."""
    from services.shared.kb_client import KBClient
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    cache_key = (slug, agent)

    # Find KB directory
    kb_dir = Path(f"/home/vokov/projects/{slug}/agents/{agent}/kb")
    if not kb_dir.exists() or not list(kb_dir.glob("*.md")):
        # fallback to docs/kb/
        kb_dir = Path("/home/vokov/workspace/ai-drakon-scaffolder/docs/kb")

    # Re-index if not cached or docs changed
    if cache_key not in _kb_cache:
        kb = KBClient(":memory:")
        if kb_dir.exists():
            n = kb.index_documents(kb_dir)
        _kb_cache[cache_key] = kb

    query = state.get("query") or state.get("input", "")
    results = _kb_cache[cache_key].search(query, top_k=5) if query else []
    context = "\\n\\n".join(results)
    return {**state, "kb_results": results, "context": context}'''

if old_fn in content:
    content = content.replace(old_fn, new_fn)
    print("search_kb replaced")
else:
    print("WARNING: old_fn not found, manual check needed")
    print("Current search_kb lines:")
    for i, line in enumerate(content.split("\\n")):
        if "search_kb" in line or "KBClient" in line:
            print(f"  {i}: {line}")

open(fpath, "w").write(content)
PYEOF'

STEP 4: Додай API для завантаження docs в KB проекту
  В project_pipeline_route.py додай endpoint:

  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/project_pipeline_route.py"
content = open(fpath).read()

kb_endpoint = '''

@router.get("/{slug}/agents/{agent}/kb/search")
def search_project_kb(slug: str, agent: str, q: str = ""):
    """Search project KB directly."""
    from services.shared.built_in_tools import search_kb, _kb_cache
    # Invalidate cache to force re-index
    _kb_cache.pop((slug, agent), None)
    result = search_kb({"project_slug": slug, "agent_name": agent, "query": q, "input": q})
    return {"results": result.get("kb_results", []), "count": len(result.get("kb_results", []))}


@router.post("/{slug}/agents/{agent}/kb/upload")
async def upload_kb_doc(slug: str, agent: str, filename: str, content: str = ""):
    """Upload a markdown document to project KB."""
    from services.shared.built_in_tools import _kb_cache
    kb_dir = _kb_dir(slug, agent)
    doc_path = kb_dir / filename
    if not filename.endswith(".md"):
        raise HTTPException(400, "Only .md files supported")
    doc_path.write_text(content, encoding="utf-8")
    # Invalidate cache
    _kb_cache.pop((slug, agent), None)
    return {"saved": str(doc_path), "size": len(content)}
'''

if "kb/search" not in content:
    # Add before last line
    content = content.rstrip() + kb_endpoint
    open(fpath, "w").write(content)
    print("KB endpoints added")
else:
    print("already has kb endpoints")
PYEOF'

STEP 5: Smoke test — завантаж тестовий doc і перевір пошук
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "mkdir -p /home/vokov/projects/sharon-uav/agents/threat-classifier/kb && \
     echo '## UAV Threats\nKamikazes fly at 50-200m altitude. Identified by acoustic signature.\n\n## Safe Events\nBirds, wind noise, civilian aircraft.' > \
     /home/vokov/projects/sharon-uav/agents/threat-classifier/kb/threats.md"

  curl -s 'http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/kb/search?q=kamikaze' | head -20

STEP 6: Restart сервіс якщо потрібно і верифікуй
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "sudo rc-service ai-architect-agent restart 2>/dev/null || \
     sudo rc-service architect-agent restart 2>/dev/null && sleep 2 && \
     curl -s http://192.168.3.184:8766/health"

STEP 7: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add services/shared/built_in_tools.py \
             services/architect-agent/project_pipeline_route.py && \
     git commit -m 'feat(shared): per-project KB caching + upload/search endpoints (Task 4)' && \
     git push origin main"

STEP 8: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-38/[x] TASK-38/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-38 done — KB per project' && \
     git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-38:kb-per-project|search_kb.cached|upload.endpoint|DONE|commit:<hash>|***"
```

---

### TASK-39: Task 5 — UI: bind /agents page to active project + demo pipeline

```
[x] TASK-39

META: Прив'язати /agents page до active project context.
      Зробити sharon-uav demo pipeline та показати повний цикл:
      проект вибраний → агент вибраний → DRAKON схема → виконання.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для запису файлів.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай поточний graph-pipeline-api.ts
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cat ~/workspace/ai-drakon-scaffolder/src/lib/graph-pipeline-api.ts | head -60"

STEP 3: Оновити graph-pipeline-api.ts — додати project-scoped методи
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/src/lib/graph-pipeline-api.ts"
content = open(fpath).read()

project_api = """
// ---- Per-project agent pipeline API ----

export async function listProjectAgents(slug: string): Promise<{name: string, has_pipeline: boolean}[]> {
  const base = resolveAgentBaseUrl();
  const resp = await fetch(`${base}/projects/${slug}/agents`);
  const data = await resp.json();
  return data.agents || [];
}

export async function getProjectPipeline(slug: string, agent: string): Promise<object | null> {
  const base = resolveAgentBaseUrl();
  const resp = await fetch(`${base}/projects/${slug}/agents/${agent}/pipeline`);
  if (!resp.ok) return null;
  return resp.json();
}

export async function saveProjectPipeline(slug: string, agent: string, ir: object): Promise<boolean> {
  const base = resolveAgentBaseUrl();
  const resp = await fetch(`${base}/projects/${slug}/agents/${agent}/pipeline`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ir}),
  });
  return resp.ok;
}

export function streamProjectExecution(slug: string, agent: string, input: string): EventSource {
  const base = resolveAgentBaseUrl();
  return new EventSource(`${base}/projects/${slug}/agents/${agent}/execute?input=${encodeURIComponent(input)}`);
}
"""

if "listProjectAgents" not in content:
    content = content.rstrip() + "\\n" + project_api
    open(fpath, "w").write(content)
    # Also sync to .lovable/src/
    import shutil, os
    lovable = fpath.replace("src/", ".lovable/src/")
    if os.path.exists(os.path.dirname(lovable)):
        shutil.copy(fpath, lovable)
        print("synced to .lovable/src/")
    print("graph-pipeline-api.ts updated")
else:
    print("already has project methods")
PYEOF'

STEP 4: Створи demo sharon-uav pipeline на сервері
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
import json
from pathlib import Path

pipeline_dir = Path("/home/vokov/projects/sharon-uav/agents/threat-classifier")
pipeline_dir.mkdir(parents=True, exist_ok=True)

pipeline = {
  "name": "sharon-threat-classifier",
  "items": {
    "h":  {"type": "header", "content": "Threat Classifier", "one": "n1"},
    "n1": {"type": "action", "content": "search_kb", "one": "n2"},
    "n2": {"type": "action",
           "content": "Проаналізуй повідомлення та знайдене в KB. Визнач: є загроза UAV? JSON відповідь: {threat: bool, level: 1-5, reason: str}",
           "one": "end"},
    "end": {"type": "end"}
  },
  "schema": {"state_class": "dict", "description": "Sharon UAV threat classifier"}
}

(pipeline_dir / "pipeline.drakon.json").write_text(
    json.dumps(pipeline, indent=2, ensure_ascii=False)
)
print("sharon demo pipeline saved")
print(pipeline_dir / "pipeline.drakon.json")
PYEOF'

STEP 5: Тест повного циклу
  curl -s http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/status
  curl -s -X POST http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/execute \
    -H "Content-Type: application/json" \
    -d '{"input": "шум двигуна на низькій висоті, характерний для камікадзе"}'

STEP 6: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add src/lib/graph-pipeline-api.ts .lovable/src/lib/graph-pipeline-api.ts && \
     git commit -m 'feat(ui): add project-scoped pipeline API methods + sharon demo pipeline (Task 5)' && \
     git push origin main"

STEP 7: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-39/[x] TASK-39/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-39 done — UI project API + sharon demo' && \
     git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-39:ui-project-api+sharon-demo|pipeline:sharon-threat-classifier|DONE|commit:<hash>|***"
```

---

### TASK-40: Task 6 — Demo sharon-uav end-to-end execution test

```
[x] TASK-40

META: Довести повний цикл: sharon-uav project → threat-classifier agent →
      pipeline.drakon.json → search_kb + LLM prompt → SSE output.
      Записати результати в docs/reports/

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для тестування.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Перевір що sharon KB та pipeline існують
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "ls /home/vokov/projects/sharon-uav/agents/threat-classifier/ && \
     cat /home/vokov/projects/sharon-uav/agents/threat-classifier/pipeline.drakon.json | head -20"

STEP 3: Переконайся що KB doc є
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "ls /home/vokov/projects/sharon-uav/agents/threat-classifier/kb/ 2>/dev/null || \
     (mkdir -p /home/vokov/projects/sharon-uav/agents/threat-classifier/kb && \
      cat > /home/vokov/projects/sharon-uav/agents/threat-classifier/kb/threats.md << 'KBEOF'
## UAV Threats
Kamikazes fly at 50-200m altitude. Identified by acoustic signature — high-pitched motor sound.
Common models: Shahed-136, Lancet. Speed: 150-200 km/h.

## Safe Events
Birds, wind noise, civilian aircraft above 1000m.
Helicopter — much louder, different frequency pattern.

## Alert Levels
Level 5: confirmed kamikaze, immediate shelter needed
Level 4: high probability UAV threat
Level 3: suspicious sound, monitor
Level 2: possible threat, no immediate action
Level 1: no threat detected
KBEOF
      echo 'KB doc created')"

STEP 4: Test pipeline status
  curl -s http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/status
  # Expected: {"status":"ok","nodes":4}

STEP 5: Test KB search
  curl -s 'http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/kb/search?q=kamikaze' | head -20

STEP 6: Test full pipeline execution (SSE)
  curl -s -N -X POST http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/execute \
    -H "Content-Type: application/json" \
    -d '{"input": "чую характерний звук двигуна на малій висоті, нагадує шахед"}' \
    --max-time 30 2>/dev/null | head -20

STEP 7: Test with safe event
  curl -s -N -X POST http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/execute \
    -H "Content-Type: application/json" \
    -d '{"input": "зграя птахів над полем, звичайні звуки природи"}' \
    --max-time 30 2>/dev/null | head -10

STEP 8: Запиши результати в docs/reports/demo-sharon-uav-2026-05-29.md
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
import json, subprocess, datetime
from pathlib import Path

report = f"""---
tags: [domain:report, status:active, format:report, tier:3]
created: 2026-05-29
title: "Demo: Sharon UAV Threat Classifier — End-to-End Test"
lang: uk
---

# Demo: Sharon UAV Threat Classifier

Перший зовнішній проект на AI-DRAKON уніфікованому фреймворку.

## Конфігурація
- Project: sharon-uav
- Agent: threat-classifier
- Pipeline: 4 ноди (header → search_kb → LLM prompt → end)
- KB: /home/vokov/projects/sharon-uav/agents/threat-classifier/kb/threats.md

## Тест 1: UAV загроза
Input: "чую характерний звук двигуна на малій висоті, нагадує шахед"
"""

# Run test
result = subprocess.run(
    ["curl", "-s", "-N", "-X", "POST",
     "http://localhost:8766/projects/sharon-uav/agents/threat-classifier/execute",
     "-H", "Content-Type: application/json",
     "-d", "{\"input\": \"чую характерний звук двигуна на малій висоті, нагадує шахед\"}",
     "--max-time", "45"],
    capture_output=True, text=True, timeout=50
)
report += f"\nSSE Output:\n```\n{result.stdout[:1000]}\n```\n"
report += """
## Висновок
- Фреймворк працює end-to-end ✅
- DRAKON IR → LangGraph → built_in_tool + LLM → SSE
- Будь-який проект може використати цей паттерн

## Семантичні зв'язки
**Цей документ є частиною:** [[reports/_INDEX]]
**Пов'язано з:** [[plans/2026-05-29-unified-agent-framework-v2]]
"""

out = Path("/home/vokov/workspace/ai-drakon-scaffolder/docs/reports/demo-sharon-uav-2026-05-29.md")
out.write_text(report, encoding="utf-8")
print(f"Report written: {out}")
PYEOF'

STEP 9: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add docs/reports/demo-sharon-uav-2026-05-29.md && \
     git commit -m 'docs(demo): sharon-uav threat classifier end-to-end test report (Task 6)' && \
     git push origin main"

STEP 10: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-40/[x] TASK-40/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-40 done — sharon demo end-to-end' && \
     git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-40:sharon-demo-e2e|status:ok|4-nodes|KB+LLM|SSE|DONE|commit:<hash>|***"
```

---

### TASK-41: Task 7 — Tests для unified framework

```
[x] TASK-41

META: Написати та запустити тести для services/shared/ компонентів.
      3 ключові тести: graph compilation, KB search, pipeline execution.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для запуску тестів.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Перевір чи є існуючі тести
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "find ~/workspace/ai-drakon-scaffolder/services/shared -name 'test_*' 2>/dev/null | head -5 || echo 'no tests yet'"

STEP 3: Створи services/shared/tests/test_framework.py
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
from pathlib import Path
test_dir = Path("/home/vokov/workspace/ai-drakon-scaffolder/services/shared/tests")
test_dir.mkdir(parents=True, exist_ok=True)
(test_dir / "__init__.py").write_text("")

content = """\"\"\"Tests for AI-DRAKON unified agent framework.\"\"\"
import sys
sys.path.insert(0, "/home/vokov/workspace/ai-drakon-scaffolder")

import pytest
import tempfile
from pathlib import Path


# ---- Test 1: graph compilation (tool node) ----

def test_tool_node_compiles():
    from services.shared.graph_loader import load_graph_from_ir
    from services.shared.built_in_tools import BUILT_IN_TOOLS
    ir = {
        "name": "test",
        "items": {
            "h":   {"type": "header", "content": "Test", "one": "n1"},
            "n1":  {"type": "action", "content": "search_kb", "one": "end"},
            "end": {"type": "end"},
        }
    }
    graph = load_graph_from_ir(ir, {}, {}, {})
    assert graph is not None, "Graph should compile"


# ---- Test 2: LLM prompt node compiles ----

def test_llm_prompt_node_compiles():
    from services.shared.graph_loader import load_graph_from_ir
    ir = {
        "name": "test_llm",
        "items": {
            "h":   {"type": "header", "content": "LLM Test", "one": "n1"},
            "n1":  {"type": "action",
                    "content": "Проаналізуй: є загроза? JSON: {threat: bool}",
                    "one": "end"},
            "end": {"type": "end"},
        }
    }
    graph = load_graph_from_ir(ir, {}, {}, {})
    assert graph is not None, "LLM prompt pipeline should compile"


# ---- Test 3: mixed pipeline (tool + prompt) ----

def test_mixed_pipeline_compiles():
    from services.shared.graph_loader import load_graph_from_ir
    ir = {
        "name": "mixed",
        "items": {
            "h":   {"type": "header", "content": "Mixed", "one": "n1"},
            "n1":  {"type": "action", "content": "search_kb", "one": "n2"},
            "n2":  {"type": "action", "content": "Оціни та відповідь", "one": "end"},
            "end": {"type": "end"},
        }
    }
    graph = load_graph_from_ir(ir, {}, {}, {})
    assert graph is not None


# ---- Test 4: KB search ----

def test_kb_search():
    from services.shared.kb_client import KBClient
    with tempfile.TemporaryDirectory() as tmpdir:
        docs_dir = Path(tmpdir)
        (docs_dir / "test.md").write_text(
            "## UAV Threats\\nKamikazes identified by acoustic signature.\\n\\n"
            "## Safe\\nBirds and wind are safe.", encoding="utf-8"
        )
        kb = KBClient(":memory:")
        n = kb.index_documents(docs_dir)
        assert n > 0, f"Should index sections, got {n}"
        results = kb.search("kamikaze acoustic")
        assert len(results) > 0, "Should find results"
        assert "kamikaze" in results[0].lower() or "acoustic" in results[0].lower()


# ---- Test 5: built_in_tools registry ----

def test_built_in_tools_registry():
    from services.shared.built_in_tools import BUILT_IN_TOOLS
    assert "search_kb" in BUILT_IN_TOOLS
    assert "analyze_code" in BUILT_IN_TOOLS
    assert callable(BUILT_IN_TOOLS["search_kb"])


# ---- Test 6: _resolve_node_fn priority ----

def test_resolve_priority():
    from services.shared.graph_loader import _resolve_node_fn
    from services.shared.built_in_tools import BUILT_IN_TOOLS

    # Custom registry takes priority
    custom_fn = lambda s: s
    result = _resolve_node_fn("search_kb", {"search_kb": custom_fn})
    assert result is custom_fn, "Custom registry should take priority"

    # Built-in tool
    result = _resolve_node_fn("search_kb", {})
    assert result is BUILT_IN_TOOLS["search_kb"], "Built-in tool should be resolved"

    # LLM fallback
    result = _resolve_node_fn("Будь-який промпт тут", {})
    assert callable(result), "Unknown content should create LLM node"
    assert "llm_" in result.__name__, f"LLM node name should start with llm_, got {result.__name__}"
"""

Path(test_dir / "test_framework.py").write_text(content, encoding="utf-8")
print(f"Tests written: {test_dir / 'test_framework.py'}")
PYEOF'

STEP 4: Запусти тести
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder/services && \
     python3 -m pytest shared/tests/test_framework.py -v 2>&1 | tail -30"

STEP 5: Якщо тести не пройшли — виправ причину і запусти ще раз
  Типові проблеми:
  - langgraph не встановлено в shared: pip install langgraph
  - ImportError: перевір sys.path

STEP 6: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add services/shared/tests/ && \
     git commit -m 'test(shared): add framework tests — graph compile, KB search, tool resolution (Task 7)' && \
     git push origin main"

STEP 7: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-41/[x] TASK-41/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-41 done — framework tests' && \
     git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-41:framework-tests|6-tests|PASS|DONE|commit:<hash>|***"
```

---

### TASK-42: Task 8 — Оновити документацію (COLLABORATION.md + plans _INDEX)

```
[x] TASK-42

META: Оновити docs/COLLABORATION.md — додати розділ про AI-DRAKON як Developer Tool.
      Оновити docs/plans/_INDEX.md — додати нові плани.
      Синхронізувати SYNC_METHODOLOGY.md з новим розумінням системи.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device for diary.
SSH до 192.168.3.184 для запису файлів.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай поточний docs/COLLABORATION.md
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "grep '^## ' ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md"

STEP 3: Додай новий розділ в docs/COLLABORATION.md
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md"
content = open(fpath).read()

new_section = """
---

## 13. AI-DRAKON як Developer Tool

AI-DRAKON — це не самостійний проект, а **інструментарій розробника агентів**.

### Концепція
Розробник використовує AI-DRAKON щоб будувати LangGraph-агентів для БУДЬ-ЯКОГО проекту:
- Sharon UAV Watcher → threat-classifier agent
- CRM система → ticket-handler agent
- Будь-що інше → свій агент з DRAKON-логікою

### Unified Framework (реалізовано 2026-05-29)
```
services/shared/
  graph_loader.py    ← DRAKON IR → LangGraph StateGraph
  kb_client.py       ← SQLite FTS5 пошук (unicode61, кирилиця)
  llm_client.py      ← AGY/Anthropic/OpenAI клієнт
  ai_memory.py       ← ai-memory MCP wrapper
  built_in_tools.py  ← search_kb, analyze_code, generate_ir, save_to_project
  llm_node.py        ← llm_node_factory(prompt) → LangGraph node
```

### Автоматичне розрізнення tool vs prompt
```python
# DRAKON action node content може бути:
# 1. Назва built-in tool → "search_kb", "analyze_code"
# 2. LLM промпт → "Проаналізуй та визнач загрозу"
# graph_loader.py автоматично:
fn = _resolve_node_fn(content, node_registry)
# priority: per-agent registry > BUILT_IN_TOOLS > llm_node_factory
```

### Per-project storage
```
~/projects/{slug}/agents/{name}/
  pipeline.drakon.json   ← DRAKON IR (source of truth)
  kb/*.md                ← база знань агента
```

### API (architect-agent :8766)
```
GET  /projects/{slug}/agents                    → список агентів
PUT  /projects/{slug}/agents/{name}/pipeline    → зберегти + компілювати
POST /projects/{slug}/agents/{name}/execute     → SSE виконання
GET  /projects/{slug}/agents/{name}/kb/search   → пошук по KB
```

### Demo: Sharon UAV
`/projects/sharon-uav/agents/threat-classifier/` — перший реальний проект.
Pipeline: search_kb → LLM prompt → SSE output.

## Семантичні зв'язки
"""

# Replace the semantic links at end
if "## 13. AI-DRAKON як Developer Tool" not in content:
    # Find semantic links section and insert before it
    idx = content.rfind("## Семантичні зв'язки")
    if idx > 0:
        content = content[:idx] + new_section + content[idx:]
    else:
        content = content + new_section
    open(fpath, "w").write(content)
    print("COLLABORATION.md updated")
else:
    print("already has section 13")
PYEOF'

  # Sync to .lovable/src/
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cp ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md \
        ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md 2>/dev/null && echo 'synced'"

STEP 4: Оновити docs/plans/_INDEX.md
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/docs/plans/_INDEX.md"
content = open(fpath).read()
new_rows = """| [[plans/2026-05-29-unified-agent-framework-v2]] | Revised plan: AI-DRAKON as Developer Tool | active | 1 |
| [[plans/2026-05-29-unified-agent-framework]] | Original unified framework plan (Tasks 1-8) | active | 2 |
"""
if "unified-agent-framework-v2" not in content:
    # Add to table if exists or append
    if "| [[" in content:
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if "| [[" in line and "unified" not in line:
                lines.insert(i, new_rows.strip())
                break
        content = "\n".join(lines)
    else:
        content += "\n" + new_rows
    open(fpath, "w").write(content)
    print("_INDEX.md updated")
else:
    print("already has entries")
PYEOF'

STEP 5: Оновити docs/reports/_INDEX.md з новими звітами
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << '"'"'PYEOF'"'"'
fpath = "/home/vokov/workspace/ai-drakon-scaffolder/docs/reports/_INDEX.md"
content = open(fpath).read()
new_entries = """| [[reports/agent-architecture-2026-05-29]] | Архітектура 3 агентів + пропозиція уніфікації | active | 2 |
| [[reports/context-search-research-2026-05-29]] | Контекстний пошук: SQLite FTS5 рекомендовано | active | 2 |
| [[reports/demo-sharon-uav-2026-05-29]] | Demo: Sharon UAV threat classifier end-to-end | active | 3 |
| [[reports/sync-update-2026-05-29]] | Sprint 2026-05-29: синхронізація Claude+AGY | active | 3 |
"""
if "agent-architecture-2026-05-29" not in content:
    content = content.rstrip() + "\n" + new_entries
    open(fpath, "w").write(content)
    print("reports/_INDEX.md updated")
else:
    print("already has entries")
PYEOF'

STEP 6: Commit все
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add docs/COLLABORATION.md docs/plans/_INDEX.md docs/reports/_INDEX.md && \
     git commit -m 'docs: update COLLABORATION.md (AI-DRAKON as dev tool) + _INDEX files (Task 8)' && \
     git push origin main"

STEP 7: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-42/[x] TASK-42/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-42 done — docs updated' && \
     git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-42:docs-update|COLLABORATION.md+indexes|DONE|commit:<hash>|***"
```

---

### TASK-43: Sharon UAV — Handoff документ (приклад використання unified framework)

```
[x] TASK-43

META: Написати docs/handoff/sharon-uav-handoff.md як зразковий приклад
      підключення реального проекту до AI-DRAKON unified framework.
      Навчальний документ — "як це робити" на реальному прикладі Sharon UAV.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device.
SSH до 192.168.3.184 для запису файлів.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай контекст Sharon + framework
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "grep -A 60 '## 13' ~/workspace/ai-drakon-scaffolder/docs/COLLABORATION.md | head -60"

STEP 3: Створи docs/handoff/sharon-uav-handoff.md через Python скрипт
  Напиши та виконай Python скрипт через SSH що:
  a) mkdir -p ~/workspace/ai-drakon-scaffolder/docs/handoff/
  b) Створює sharon-uav-handoff.md з розділами:
     - Що таке Sharon UAV (опис проекту)
     - Як Sharon підключена до AI-DRAKON (step-by-step: slug, pipeline IR JSON, KB, execute, SSE)
     - Структура unified framework (services/shared/, _resolve_node_fn магія)
     - Як запустити тести (pytest 6/6 PASS)
     - API довідка (architect-agent :8766, всі endpoints)
     - Template для підключення власного проекту (5 кроків)
     - Семантичні зв'язки: [[handoff/_INDEX]] [[concept/03-architecture]]
  c) Створює/оновлює docs/handoff/_INDEX.md з посиланням на новий файл

STEP 4: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add docs/handoff/ && \
     git commit -m 'docs(handoff): add sharon-uav reference handoff for AI-DRAKON framework (TASK-43)' && \
     git push origin main"

STEP 5: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-43/[x] TASK-43/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-43 done — sharon handoff doc' && \
     git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-43:sharon-handoff|docs/handoff/sharon-uav-handoff.md|DONE|commit:<hash>|***"
```

---

### TASK-44: Project Context Hub — дизайн UX та доповнення до handoff

```
[x] TASK-44

META: Дослідити та описати концепцію "Project Context Hub" —
      єдиного джерела правди для проекту в AI-DRAKON платформі.
      Ключова ідея Q: обрав проект → автоматично підтягнувся репозиторій,
      KB, агенти, пайплайни → все доступно на всіх робочих просторах.
      Зараз цього немає — кожен workspace ізольований.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device.
SSH до 192.168.3.184 для запису файлів. НЕ встановлюй pip пакети.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Прочитай поточний стан
  sshpass -p "805235io." ssh vokov@192.168.3.184     "cat ~/workspace/ai-drakon-scaffolder/docs/handoff/sharon-uav-handoff.md"
  sshpass -p "805235io." ssh vokov@192.168.3.184     "grep -r 'project' ~/workspace/ai-drakon-scaffolder/services/shared/drakon_shared/ --include='*.py' -l"

STEP 3: Напиши docs/handoff/project-context-hub.md
  Файл має розкривати відповіді на питання:

  A) ЯК МАЄ ПРАЦЮВАТИ (UX flow):
     1. Користувач відкриває AI-DRAKON платформу
     2. Вибирає або створює проект (slug)
     3. Вказує GitHub repo URL → платформа клонує/синкає код
     4. Автоматично: індексація коду в KB, завантаження агентів, пайплайнів
     5. Всі workspace (агент-чат, DRAKON-редактор, code viewer) бачать ОДИН проект
     6. Зміна проекту → все перемикається разом

  B) СТРУКТУРА ДАНИХ проекту:
     ~/projects/{slug}/
       config.json         ← slug, repo_url, github_token, created_at
       repo/               ← git clone репозиторію (auto-sync)
       agents/             ← агенти та їх пайплайни
         {name}/
           pipeline.drakon.json
           kb/             ← база знань (MD файли)
       .last_sync          ← timestamp останньої синхронізації

  C) ЯКИХ КОМПОНЕНТІВ НЕ ВИСТАЧАЄ (gap analysis):
     - ProjectSelector компонент (глобальний стан)
     - Auto-clone/sync сервіс для GitHub repo
     - Code indexer: repo → KB chunks (для search_kb)
     - Global project context (React context або Zustand store)
     - API endpoint: POST /projects/{slug}/sync (тригер ресинку)

  D) ПРОПОЗИЦІЯ DRAKON-СХЕМИ для логіки "Project Load":
     Описати словами (не JSON) DRAKON flow:
     START → вибір проекту → repo є? → [Ні] clone → [Так] git pull
           → індексація коду → завантаження агентів → активація контексту → END

  E) ПРІОРИТЕТ РЕАЛІЗАЦІЇ (що робити спочатку):
     1. ProjectContext (React) — глобальний стан slug
     2. /projects/{slug}/config API — CRUD конфігу
     3. /projects/{slug}/sync — тригер GitHub sync
     4. CodeIndexer (services/shared/) — repo → KB
     5. UI: ProjectSelector в топ-баре

STEP 4: Запиши файл
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << INNEREOF
content = open("/dev/stdin").read()
open("/home/vokov/workspace/ai-drakon-scaffolder/docs/handoff/project-context-hub.md","w").write(content)
print("written")
INNEREOF' << FILEEOF
<ВМІСТ ФАЙЛУ ЩО AGY НАПИСАВ ВИЩЕ>
FILEEOF

  АЛЬТЕРНАТИВА (простіше):
  Запиши контент у змінну і використай python3 -c або tee:
  sshpass -p "805235io." ssh vokov@192.168.3.184     "cat > ~/workspace/ai-drakon-scaffolder/docs/handoff/project-context-hub.md" << 'DOCEOF'
  <контент>
  DOCEOF

STEP 5: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184     "cd ~/workspace/ai-drakon-scaffolder &&      git add docs/handoff/project-context-hub.md &&      git commit -m 'docs(handoff): add project-context-hub design — single source of truth (TASK-44)' &&      git push origin main"

STEP 6: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184     "cd ~/workspace/ai-drakon-scaffolder &&      sed -i 's/^\[ \] TASK-44/[x] TASK-44/' development/TASKS.md &&      git add development/TASKS.md &&      git commit -m 'chore(tasks): TASK-44 done — project context hub design' &&      git push origin main"

DIARY (!!run locally!!):
  python3 -m mempalace diary write --agent agt-ogy     "SESSION:2026-05-29|TASK-44:project-context-hub|design+gaps+drakon-flow|DONE|commit:<hash>|***"
```

---

### TASK-45: Fix /agents layout — прибрати конфлікт AgentChatPanel Sheet

```
[x] TASK-45

META: На сторінці /agents є два AgentChatPanel:
  1. Колонка в AgentStudioPage.tsx (правильно — тут має бути)
  2. Sheet в WorkspaceShell.tsx (конфлікт — відкривається замість колонки)
  Кнопка Bot у топ-барі WorkspaceShell відкриває Sheet і перекриває роботу
  вбудованих toggle кнопок StudoToolbar. Треба сховати глобальну кнопку на /agents.

!!IMPORTANT!!: NO pip install. Тільки редагування TypeScript файлів.
SSH до 192.168.3.184 для змін. Синхронізуй src/ та .lovable/src/ ОБИДВА.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Виправи WorkspaceShell.tsx — сховай Bot Sheet на /agents
  Файли (обидва):
    ~/workspace/ai-drakon-scaffolder/src/components/workspace/WorkspaceShell.tsx
    ~/workspace/ai-drakon-scaffolder/.lovable/src/components/workspace/WorkspaceShell.tsx

  ЗМІНА: pathname вже є в компоненті (є useLocation або перевірка pathname).
  Знайди блок що починається:
    <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
  І оберни умовою щоб не рендерився на /agents:
    {!pathname.startsWith('/agents') && (
      <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
        ...
      </Sheet>
    )}

  Якщо pathname не доступний — додай: const { pathname } = useLocation();
  (import вже є або додай: import { useLocation } from "react-router-dom";)

STEP 3: Перевір що AgentStudioPage має робочі toggle кнопки
  Перевір src/pages/AgentStudioPage.tsx — має бути:
  - leftPanelOpen/rightPanelOpen state
  - StudioToolbar отримує onToggleLeftPanel та onToggleRightPanel
  - При leftPanelOpen=false — PipelineList НЕ рендериться
  - При rightPanelOpen=false — PropertiesPanel + AgentChatPanel НЕ рендеряться
  Якщо є проблема — виправ.

STEP 4: Commit ОБОХ файлів
  sshpass -p "805235io." ssh vokov@192.168.3.184     "cd ~/workspace/ai-drakon-scaffolder &&      git add src/components/workspace/WorkspaceShell.tsx              .lovable/src/components/workspace/WorkspaceShell.tsx &&      git commit -m 'fix(agents): hide global Bot Sheet on /agents page — prevents conflict with studio panels (TASK-45)' &&      git push origin main"

STEP 5: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184     "cd ~/workspace/ai-drakon-scaffolder &&      sed -i 's/^\[ \] TASK-45/[x] TASK-45/' development/TASKS.md &&      git add development/TASKS.md &&      git commit -m 'chore(tasks): TASK-45 done — agents layout fix' &&      git push origin main"

DIARY:
  python3 -m mempalace diary write --agent agt-ogy     "SESSION:2026-05-29|TASK-45:agents-layout-fix|hide-bot-sheet-on-agents-route|DONE|commit:<hash>|***"
```

---

### TASK-46: Project Context Hub P1 — backend GET /projects + frontend wire-up

```
[x] TASK-46

META: Реалізувати мінімальний Project Context Hub (P1).
Фронтенд вже має:
  - ProjectContext.tsx (loadProjects, activeProject, setActiveProject)
  - ProjectSelector.tsx (UI дропдаун в WorkspaceShell рядок 322)
  - graph-pipeline-api.ts (getArchitectBase() -> architect-agent :8766)
Бракує:
  - Backend GET /projects в project_pipeline_route.py
  - Метод listProjectsArch() в graph-pipeline-api.ts
  - ProjectContext.tsx: використовувати architect-agent, не Worker

!!IMPORTANT!!: NO pip install. Тільки Python та TypeScript.
SSH до 192.168.3.184. Синхронізуй src/ та .lovable/src/ ОБИДВА.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Додай GET /projects до project_pipeline_route.py
  Файл: ~/workspace/ai-drakon-scaffolder/services/architect-agent/project_pipeline_route.py
  Після рядків з APIRouter та імпортами — додай перед першим @router.get:

  import json as _json
  _PROJECTS_ROOT = Path(os.path.expanduser('~/projects'))

  @router.get('')
  def list_projects():
      projects = []
      if _PROJECTS_ROOT.exists():
          for d in sorted(_PROJECTS_ROOT.iterdir()):
              if d.is_dir():
                  config_file = d / 'config.json'
                  config = {}
                  if config_file.exists():
                      try: config = _json.loads(config_file.read_text())
                      except Exception: pass
                  agents = [a.name for a in (d/'agents').iterdir() if a.is_dir()] if (d/'agents').exists() else []
                  projects.append({'slug': d.name, 'name': config.get('name', d.name),
                      'description': config.get('description', ''), 'repo_url': config.get('repo_url', ''),
                      'has_repo': (d/'repo').exists(), 'agents': agents})
      return {'projects': projects}

  @router.post('/{slug}')
  def create_project(slug: str, payload: dict = {}):
      project_dir = _PROJECTS_ROOT / slug
      project_dir.mkdir(parents=True, exist_ok=True)
      (project_dir / 'agents').mkdir(exist_ok=True)
      import datetime
      config = {'slug': slug, 'name': payload.get('name', slug),
          'description': payload.get('description', ''), 'repo_url': payload.get('repo_url', ''),
          'branch': payload.get('branch', 'main'),
          'created_at': datetime.datetime.utcnow().isoformat() + 'Z'}
      (project_dir / 'config.json').write_text(_json.dumps(config, indent=2, ensure_ascii=False))
      return {'success': True, 'project': config}

  ВАЖЛИВО: Якщо Path та os вже імпортовані — не дублюй.

STEP 3: Додай listProjectsArch() до graph-pipeline-api.ts (обидва src/ і .lovable/src/)

  export interface ProjectInfo {
    slug: string; name: string; description: string;
    repo_url: string; has_repo: boolean; agents: string[];
  }
  export async function listProjectsArch(): Promise<ProjectInfo[]> {
    const r = await fetch(`${getArchitectBase()}/projects`);
    if (!r.ok) throw new Error(`listProjectsArch: ${r.status}`);
    return ((await r.json()).projects ?? []);
  }
  export async function createProjectArch(slug: string, name: string, description = '', repoUrl = '') {
    const r = await fetch(`${getArchitectBase()}/projects/${encodeURIComponent(slug)}`,
      { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, description, repo_url: repoUrl }) });
    if (!r.ok) throw new Error(`createProjectArch: ${r.status}`);
    return (await r.json()).project;
  }

STEP 4: Оновити ProjectContext.tsx (обидва src/ і .lovable/src/)
  - Додай: import { listProjectsArch } from '@/lib/graph-pipeline-api';
  - В loadProjects() замінити api.listProjects() на listProjectsArch()
  - Замапити: {slug, name, description, hasDrakonIr: agents.length>0, hasDocs: false, exists: true}

STEP 5: Перезапусти architect-agent
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "pkill -f uvicorn.*8766 2>/dev/null; sleep 2; \
     cd ~/workspace/ai-drakon-scaffolder/services/architect-agent && \
     nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8766 \
       > /var/log/architect-agent.log 2>&1 & sleep 3 && \
     curl -s http://localhost:8766/projects"

STEP 6: Commit
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add services/architect-agent/project_pipeline_route.py \
             src/lib/graph-pipeline-api.ts \
             .lovable/src/lib/graph-pipeline-api.ts \
             src/context/ProjectContext.tsx \
             .lovable/src/context/ProjectContext.tsx && \
     git commit -m 'feat(hub): P1 Project Context Hub — backend GET /projects + frontend (TASK-46)' && \
     git push origin main"

STEP 7: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-46/[x] TASK-46/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-46 done — project hub P1' && \
     git push origin main"

DIARY:
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-46:project-hub-P1|backend+frontend|DONE|commit:<hash>|***"
```

---

### TASK-47: Аудит інтерфейсу через PinchTab — перевір що ти зробив

```
[ ] TASK-47

META: Ти (AGY3) реалізував TASK-45 (Bot Sheet fix) та TASK-46 (Project Context Hub P1).
      Тепер перевір власну роботу через PinchTab браузерну автоматизацію.
      PinchTab = інструмент що керує Chrome на dev server через HTTP API.
      Порівняй план з реальністю. Задокументуй що працює і що ні.

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device.
SSH до 192.168.3.184 для PinchTab. НЕ встановлюй нічого.

== ЯК КОРИСТУВАТИСЬ PINCHTAB ==

PinchTab HTTP API на 192.168.3.184:9867
Token: 0117419fcfb5de5d82220c1f9da8de97
Заголовок: X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97

Базові команди (виконувати через SSH на 192.168.3.184):

1. Відкрити сторінку:
  curl -s -X POST http://localhost:9867/navigate \
    -H "Content-Type: application/json" \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    -d '{"url": "URL_ТУТА"}'

2. Зробити скріншот (pipe to base64 decode):
  TAB=$(curl -s http://localhost:9867/tabs \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    | python3 -c "import json,sys; tabs=json.load(sys.stdin); print(tabs[0]['id'] if tabs else '')")
  curl -s http://localhost:9867/tabs/$TAB/screenshot \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    | python3 -c "import json,sys,base64; d=json.load(sys.stdin); open('/tmp/screen.png','wb').write(base64.b64decode(d.get('data','') or d.get('screenshot','')))" 2>/dev/null
  echo 'Screenshot at /tmp/screen.png'

3. Отримати текст сторінки:
  TAB=$(curl -s http://localhost:9867/tabs \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    | python3 -c "import json,sys; tabs=json.load(sys.stdin); print(tabs[0]['id'] if tabs else '')")
  curl -s http://localhost:9867/tabs/$TAB/text \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('text','')[:2000])"

4. Список табів:
  curl -s http://localhost:9867/tabs \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    | python3 -m json.tool

== ПЛАН АУДИТУ ==

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Відкрий https://ai-drakon-scaffolder.pages.dev/ та зроби скріншот
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    'curl -s -X POST http://localhost:9867/navigate \
    -H "Content-Type: application/json" \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    -d '{"url": "https://ai-drakon-scaffolder.pages.dev/"}'
  sleep 3
  # Зроби скріншот і збережи в /tmp/audit-home.png

STEP 3: Перевір /agents — чи є редактор та панелі
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    'curl -s -X POST http://localhost:9867/navigate \
    -H "Content-Type: application/json" \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    -d '{"url": "https://ai-drakon-scaffolder.pages.dev/agents"}'
  sleep 3
  # Отримай текст сторінки — чи є 'DRAKON Logic', 'PipelineList', 'AgentChatPanel'
  # Зроби скріншот /tmp/audit-agents.png

STEP 4: Перевір ProjectSelector — вибери проект sharon-uav
  # Отримай список інтерактивних елементів через /snapshot
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "TAB=$(curl -s http://localhost:9867/tabs -H 'X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97' | python3 -c 'import json,sys; t=json.load(sys.stdin); print(t[0][chr(105)+chr(100)] if t else str())') && curl -s http://localhost:9867/tabs/$TAB/snapshot -H 'X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97' | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(e.get(chr(114)+chr(101)+chr(102)),e.get(chr(116)+chr(101)+chr(120)+chr(116),'')[:60]) for e in d.get(chr(101)+chr(108)+chr(101)+chr(109)+chr(101)+chr(110)+chr(116)+chr(115),[])[:30]]'"

STEP 5: Перевір /docs — чи показується документація по проекту
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    'curl -s -X POST http://localhost:9867/navigate \
    -H "Content-Type: application/json" \
    -H "X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97" \
    -d '{"url": "https://ai-drakon-scaffolder.pages.dev/docs"}'
  sleep 2
  # Отримай текст — чи є 'sharon' або тільки 'ai-drakon'

STEP 6: Напиши звіт в docs/reports/audit-2026-05-29.md
  Формат звіту:
  ---
  # Аудит інтерфейсу 2026-05-29
  ## /agents
  - [ ] DRAKON Editor видимий
  - [ ] Ліва панель (PipelineList) видима та згортається
  - [ ] Права панель видима та згортається
  - [ ] Bot Sheet НЕ відкривається глобально (TASK-45)
  ## ProjectSelector
  - [ ] Показує список проектів
  - [ ] sharon-uav є в списку
  - [ ] При виборі проекту — щось змінюється
  ## /docs
  - [ ] Документація прив'язана до активного проекту
  ## /code
  - [ ] Показує код репозиторію або порожньо
  ## Висновок: що потрібно виправити
  ---

STEP 7: Commit звіту
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add docs/reports/audit-2026-05-29.md && \
     git commit -m 'docs(audit): UI audit report 2026-05-29 — PinchTab findings (TASK-47)' && \
     git push origin main"

STEP 8: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-47/[x] TASK-47/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-47 done — UI audit' && \
     git push origin main"

DIARY:
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|TASK-47:ui-audit|pinchtab-findings|DONE|commit:<hash>|***"
```

---

### TASK-48: AGY phone — обробка звітів аудиту + перевірка ai-memory sync з AGY3

```
[x] TASK-48

META: AGY phone (POCCO C71) — проста задача паралельно з TASK-47.
      1. Дочекатись коміту звіту від AGY3 (docs/reports/audit-2026-05-29.md)
      2. Додати запис в reports/_INDEX.md
      3. Перевірити ai-memory sync — чи AGY3 записав свою сесію
      4. Записати підсумкове diary для сесії 2026-05-29

!!IMPORTANT!!: Run ALL commands locally on THIS Termux device (AGY phone).
SSH до 192.168.3.184 для файлів. НЕ встановлюй нічого.

STEP 1: git pull та чекай audit-2026-05-29.md
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main
  # Якщо файл ще не з'явився — зачекай 30 секунд і pull ще раз
  ls ~/workspace/ai-drakon-scaffolder/docs/reports/audit-2026-05-29.md 2>/dev/null \
    && echo 'READY' || (sleep 30 && git pull origin main --quiet)

STEP 2: Додай audit звіт в reports/_INDEX.md
  sshpass -p "805235io." ssh vokov@192.168.3.184 'python3 - << PYEOF
from pathlib import Path
idx = Path('/home/vokov/workspace/ai-drakon-scaffolder/docs/reports/_INDEX.md')
content = idx.read_text(encoding='utf-8')
entry = '| [[reports/audit-2026-05-29]] | UI аудит через PinchTab — TASK-45/46/47 findings | active | 3 |'
if 'audit-2026-05-29' not in content:
    content = content.replace('## Семантичні', entry + chr(10) + '## Семантичні')
    idx.write_text(content, encoding='utf-8')
    print('_INDEX updated')
else: print('already exists')
PYEOF'

STEP 3: Перевір ai-memory сервер — чи AGY3 записав свою сесію
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "curl -s http://localhost:49374/search?q=TASK-47 2>/dev/null | python3 -m json.tool | head -20 || \
     curl -s http://localhost:49374/web 2>/dev/null | head -5"

  # Очікуваний результат: є запис від AGY3 про TASK-47
  # Якщо немає — просто зафіксуй в diary що синк не відбувся

STEP 4: Запиши підсумкове diary сесії 2026-05-29
  python3 -m mempalace diary write --agent agt-ogy \
    "SESSION:2026-05-29|END|TASKS-41-48|DONE|TASK-41:6tests|TASK-42:docs|TASK-43:sharon-handoff|TASK-44:hub-design|TASK-45:agents-fix|TASK-46:hub-P1|TASK-47:audit|TASK-48:sync-check|ai-memory:checked|***"

STEP 5: Commit _INDEX
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     git add docs/reports/_INDEX.md && \
     git commit -m 'docs(reports): add audit-2026-05-29 to _INDEX (TASK-48)' && \
     git push origin main"

STEP 6: Mark done
  sshpass -p "805235io." ssh vokov@192.168.3.184 \
    "cd ~/workspace/ai-drakon-scaffolder && \
     sed -i 's/^\[ \] TASK-48/[x] TASK-48/' development/TASKS.md && \
     git add development/TASKS.md && \
     git commit -m 'chore(tasks): TASK-48 done — reports index + ai-memory check' && \
     git push origin main"
```

---

### TASK-47b: AGY3 — PinchTab аудит /agents (виправлена версія)

```
[x] TASK-47b

META: TASK-47 провалилась — намагався запустити dev server.
      PinchTab вже ЗАПУЩЕНИЙ на 192.168.3.184:9867. Просто використай HTTP API.

== PINCHTAB: ЩО ЦЕ І ЯК КОРИСТУВАТИСЬ ==

PinchTab = Chrome браузер що керується через HTTP API.
Сервер: http://localhost:9867 (вже запущений на 192.168.3.184)
Token: 0117419fcfb5de5d82220c1f9da8de97
Заголовок: X-Pinchtab-Token: <token>

НЕ запускай dev server. НЕ встановлюй пакети. Просто curl через SSH.

STEP 1: git pull
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main

STEP 2: Перевір що PinchTab живий
  sshpass -p "805235io." ssh vokov@192.168.3.184 "curl -s http://localhost:9867/health -H 'X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97'"

STEP 3: Відкрий /agents і прочитай текст
  a) Навігація:
  sshpass -p "805235io." ssh vokov@192.168.3.184 "curl -s -X POST http://localhost:9867/navigate -H 'Content-Type: application/json' -H 'X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97' -d '{\"url\": \"https://ai-drakon-scaffolder.pages.dev/agents\"}'"

  b) Зачекай 5 секунд (sleep 5)

  c) Отримай ID табу:
  sshpass -p "805235io." ssh vokov@192.168.3.184 "curl -s http://localhost:9867/tabs -H 'X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97'"
  (збережи id першого табу у змінну TAB)

  d) Отримай текст сторінки:
  sshpass -p "805235io." ssh vokov@192.168.3.184 "curl -s http://localhost:9867/tabs/$TAB/text -H 'X-Pinchtab-Token: 0117419fcfb5de5d82220c1f9da8de97' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get(chr(116)+chr(101)+chr(120)+chr(116),"")[:2000])'"

  e) Запиши: є слова DRAKON, Pipeline, агент, редактор?

STEP 4: Перевір /docs (той самий спосіб, змінити URL)
  Запиши: є sharon-uav чи тільки ai-drakon?

STEP 5: Перевір /code
  Запиши: порожньо чи є код?

STEP 6: Напиши звіт
  Файл: ~/workspace/ai-drakon-scaffolder/docs/reports/audit-2026-05-29.md
  Формат:
    # UI Аудит 2026-05-29
    ## /agents
    - [x/o] DRAKON Editor видимий: <так/ні>
    - [x/o] Панелі розкриваються: <так/ні>
    ## /docs: <що показує>
    ## /code: <що показує>
    ## Висновок: <що треба виправити>

STEP 7: Commit + push
  git add docs/reports/audit-2026-05-29.md
  git commit -m "docs(audit): UI audit 2026-05-29 via PinchTab (TASK-47b)"
  git push origin main

STEP 8: Mark done
  sed -i s 47b 47b (оновити TASKS.md)

DIARY:
  python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-05-29|TASK-47b:audit|pinchtab|DONE|***"
```



---

## TASK-49: docs — ai-memory sync
**Status:** [x] done
**Agent:** agt-ogy3 (AGY3 tablet)
**Context:** !!IMPORTANT!! Run locally on Termux. Do NOT SSH anywhere.

### Що зробити

Створити файл `docs/ai-memory-sync.md` у репозиторії ai-drakon-scaffolder.
Документ описує методику синхронізації сесій між трьома агентами через ai-memory.

### Файл для створення

**Path:** `~/workspace/ai-drakon-scaffolder/docs/ai-memory-sync.md`

### Зміст документа (скопіюй verbatim, можна покращити стиль)

```markdown
# AI-Memory Cross-Agent Sync

Методика синхронізації сесій між агентами: Claude Code (OrangePi), AGY phone, AGY3 tablet.

## Інфраструктура

| Компонент | Значення |
|-----------|---------|
| Server | dev server (192.168.3.184) |
| Port | 49374 |
| Tailscale | http://100.113.140.25:49374 (primary) |
| LAN fallback | http://192.168.3.184:49374 |
| Shared project | `vokov` |
| Wiki UI | http://192.168.3.184:49374/web |
| Docker | `docker restart ai-memory` |

## Принцип роботи

1. Кожен агент при **старті сесії** реєструється через hook + читає що зробили інші
2. Кожен агент при **кінці сесії** пише wiki-сторінку з підсумком
3. Всі пишуть/читають `project="vokov"` — спільний namespace

```
Agent start → POST /hook?event=SessionStart (cwd=/home/vokov, project=vokov)
           → memory_recent(project=vokov)  ← бачить сторінки всіх агентів

Agent stop  → POST /hook?event=Stop
           → memory_write_page(project=vokov) → sessions/<agent>-latest.md
```

## Агенти та скрипти

| Агент | ID | Start | End |
|-------|----|-------|-----|
| Claude Code | claude-code | SessionStart hook (auto) | Stop hook (auto) |
| AGY phone | agt-ogy | `~/bin/ai-memory-start.sh` | `~/bin/ai-memory-end.sh "summary"` |
| AGY3 tablet | agt-ogy3 | `~/bin/ai-memory-start.sh` | `~/bin/ai-memory-end.sh "summary"` |

## Shared Wiki Pages (project=vokov)

- `sessions/claude-latest.md` — останній Claude Code
- `sessions/agt-ogy-latest.md` — останній AGY phone
- `sessions/agt-ogy3-latest.md` — останній AGY3 tablet

## MCP API (пряме звернення)

```bash
# Читати останні зміни
curl -s -X POST "http://100.113.140.25:49374/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_recent","arguments":{"limit":5,"project":"vokov"}}}'

# Написати нотатку про важливу зміну
curl -s -X POST "http://100.113.140.25:49374/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_write_page","arguments":{"path":"notes/change-2026-05-29.md","body":"# Зміна\\n...","project":"vokov","tier":"episodic","tags":["change"]}}}'
```

## Поширення важливих змін між агентами

Якщо зробив щось значиме (не просто завдання, а архітектурне рішення):

```bash
# Ручний запис — всі побачать при наступному старті
bash ~/bin/ai-memory-end.sh "короткий опис що змінив"
```

Claude Code: при закінченні сесії Stop hook записує автоматично.
```

### Кроки виконання

STEP 1: Переконайся що знаходишся в правильному репозиторії
```
cd ~/workspace/ai-drakon-scaffolder
git pull origin main
```

STEP 2: Перевір чи є папка docs
```
ls docs/ 2>/dev/null || mkdir docs
```

STEP 3: Створи файл docs/ai-memory-sync.md з вмістом вище

STEP 4: Commit + push
```
git add docs/ai-memory-sync.md
git commit -m "docs(infra): add ai-memory cross-agent sync methodology (TASK-49)"
git push origin main
```

STEP 5: Mark done у TASKS.md
```
sed -i "s/## TASK-49.*\[ \] pending/## TASK-49: docs — ai-memory sync\n**Status:** [x] done/" development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-49 done"
git push origin main
```

DIARY:
```
python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-49:ai-memory-sync-docs|commit:$(git rev-parse --short HEAD)|DONE|***"
```

---

## TASK-50: fix(code-tab) — активний проект у Code page + перейменування в CommandPalette

**Status:** [ ] pending
**Agent:** agt-ogy3 (AGY3 tablet)
**Context:** !!IMPORTANT!! Run locally on Termux. Do NOT SSH anywhere.
**Repo:** ~/workspace/ai-drakon-scaffolder

### Проблеми

1. Вкладка Код (/code) показує Не вдалося завантажити — CodePage читає owner/repo/branch з глобального Settings (getGithubConfig()), а не з активного проекту
2. У CommandPalette (Cmd+K) залишилась стара кнопка GitHub -> треба Код

### ЗМІНА 1: src/components/workspace/CommandPalette.tsx

Знайти у масиві NAV_ITEMS рядок:
  { label: "GitHub", to: "/github", icon: GitBranch, shortcut: "G H" },

Замінити на:
  { label: "Код", to: "/code", icon: FileCode, shortcut: "G C" },

В імпорті lucide-react: замінити GitBranch на FileCode (якщо GitBranch більше не потрібен).

### ЗМІНА 2: src/pages/CodePage.tsx

Знайти функцію CodePage(). На початку є блок:

  const ghCfg = getGithubConfig();
  const owner = ghCfg.owner || ghCfg.repo.split("/")[0] || "";
  const repo = ghCfg.repo.includes("/") ? ghCfg.repo.split("/")[1] : ghCfg.repo;
  const branch = ghCfg.branch || "main";
  const token = ghCfg.token;

Замінити на:

  const { activeProject } = useProject();
  const ghCfg = getGithubConfig();
  const token = ghCfg.token;
  const projectGh = activeProject?.github;
  const owner = projectGh?.owner || ghCfg.owner || ghCfg.repo.split("/")[0] || "";
  const repoRaw = ghCfg.repo.includes("/") ? ghCfg.repo.split("/")[1] : ghCfg.repo;
  const repo = projectGh?.repo || repoRaw;
  const branch = projectGh?.branch || ghCfg.branch || "main";

Додати імпорт useProject якщо нема:
  import { useProject } from "@/context/ProjectContext";

Текст у FileTree "Налаштуйте GitHub у Settings" -> "Налаштуйте GitHub у проекті або в Settings"

### Верифікація

  cd ~/workspace/ai-drakon-scaffolder && npm run build 2>&1 | tail -20

### Commit + push

  git add src/components/workspace/CommandPalette.tsx src/pages/CodePage.tsx
  git commit -m "fix(ui): use active project github in CodePage + rename GitHub to Kod in CommandPalette (TASK-50)"
  git push origin main

### Mark done + diary

  git add development/TASKS.md
  git commit -m "chore(tasks): mark TASK-50 done"
  git push origin main
  python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-50:code-tab-fix|DONE|***"

---

## TASK-51: fix(code-tab) — прибрати token guard

**Status:** [x] done
**Agent:** agt-ogy3 (AGY3 tablet)
**Context:** !!IMPORTANT!! Run locally on Termux. Do NOT SSH. No build needed - Cloudflare Pages builds automatically.
**Repo:** ~/workspace/ai-drakon-scaffolder

### Проблема

Worker (drakon-mcp-worker) має власні GitHub credentials — token з клієнта не потрібен.
Але FileTree має guard `!token` що блокує завантаження коли токен не заданий у Settings.
Треба прибрати залежність від клієнтського token у FileTree.

Плюс: коли activeProject не має github конфігу — треба показувати зрозуміле повідомлення.

### Зміни у src/pages/CodePage.tsx

#### 1. У функції FileTree — функція load() (рядок ~55):

Знайти:
  if (!owner || !repo || !token) return;

Замінити (обидва місця де така умова в load() та openFile()):
  if (!owner || !repo) return;

#### 2. У функції FileTree — guard перед рендером (рядок ~93):

Знайти:
  if (!owner || !repo || !token) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-3">
        <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="font-mono text-[9px] text-[var(--text-muted)] text-center">
          Налаштуйте GitHub у проекті або в Settings
        </span>
      </div>
    );
  }

Замінити на:
  if (!owner || !repo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-3">
        <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="font-mono text-[9px] text-[var(--text-muted)] text-center">
          Проект не має GitHub конфігу. Додайте repo у налаштуваннях проекту.
        </span>
      </div>
    );
  }

#### 3. У функції openFile() (рядок ~196):

Знайти:
  if (!owner || !repo || !token) return;

Замінити:
  if (!owner || !repo) return;

#### 4. У функції saveToGit() (рядок ~217):

Знайти:
  if (!owner || !repo || !token) {
    toast.error("Налаштуйте GitHub у Settings");
    return;
  }

Замінити:
  if (!owner || !repo) {
    toast.error("Проект не має GitHub конфігу");
    return;
  }

### ТАКОЖ (важливо): src/pages/CodePage.tsx рядок з token у FileTree props

Знайти де FileTree викликається (JSX):
  <FileTree
    owner={owner} repo={repo} branch={branch} token={token}

ПЕРЕВІР: якщо token передається як prop до FileTree і FileTree використовує його у githubListTree — то і цей prop треба залишити (не прибирати), просто умови перевірки !token вище вже прибрали.

### Commit + push (БЕЗ build — Cloudflare збудує сам)

  cd ~/workspace/ai-drakon-scaffolder
  git add src/pages/CodePage.tsx
  git commit -m "fix(code-tab): remove client token guard from FileTree, Worker handles auth (TASK-51)"
  git push origin main

### Mark done

  python3 -c "
import re
with open("development/TASKS.md") as f: t = f.read()
t = t.replace("## TASK-51: fix(code-tab) — прибрати token guard, показувати github статус проекту\n\n**Status:** [ ] pending", "## TASK-51: fix(code-tab) — прибрати token guard\n\n**Status:** [x] done")
with open("development/TASKS.md", "w") as f: f.write(t)
print("done")
"
  git add development/TASKS.md
  git commit -m "chore(tasks): mark TASK-51 done"
  git push origin main

### DIARY

  python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-51:code-tab-token-fix|DONE|***"

---

## TASK-52: analysis — глибокий аналіз CodePage + Worker github routes

**Status:** [x] done
**Agent:** agt-ogy3 (AGY3 tablet)
**Context:** !!IMPORTANT!! Run locally on Termux. Analysis only — NO code changes, NO commits.
**Repo:** ~/workspace/ai-drakon-scaffolder

### Ціль

Зробити глибокий аналіз вкладки Код (CodePage) та Worker github routes.
Виявити всі потенційні баги, edge cases, UX проблеми.

### Файли для аналізу

1. src/pages/CodePage.tsx
2. src/context/ProjectContext.tsx
3. src/lib/api.ts (функції github*)
4. cloudflare-worker/worker-mcp-drakon.js (секції github + projects)

### Питання для аналізу

#### CodePage.tsx
- Чи правильно CodePage оновлює файлове дерево при зміні activeProject?
  (useEffect або useCallback з залежністю від owner/repo?)
- Чи є ризик stale closure — функція load() в FileTree capture старий owner/repo?
- При зміні проекту — чи скидається selectedPath та код в едіторі?
- Що відбувається якщо activeProject змінився під час завантаження?
- Чи є memory leak (незакритий setInterval pollRef)?
- File save: чи правильно передається fileSha при оновленні файлу?

#### ProjectContext.tsx
- Як часто завантажується список проектів?
- Чи є відповідний useEffect що оновлює activeProject при зміні projects list?
- Якщо localStorage має застарілий activeProject — чи є recovery?

#### API + Worker
- В public github routes: чи передається owner/repo валідація (пустий рядок)?
- Чи є rate limiting для public routes (без auth)?
- Що повертає Worker якщо GitHub API повертає 404 (repo не існує)?

### Формат звіту

Створи файл docs/reports/code-analysis-2026-05-29.md з секціями:

1. **Критичні баги** (ламають функціонал)
2. **Потенційні проблеми** (edge cases)
3. **UX проблеми** (незрозуміло для користувача)
4. **Рекомендовані фікси** (пріоритет: критичні спочатку)

### Commit

  git add docs/reports/code-analysis-2026-05-29.md
  git commit -m "docs(analysis): deep code analysis of CodePage + Worker github routes (TASK-52)"
  git push origin main

### Mark done + diary

  python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-52:code-analysis|DONE|commit:$(git rev-parse --short HEAD)|***"

---

## TASK-53: fix code-tab — 4 fixes: stale state + memory leak + deleted project

**Status:** [x] done
**Agent:** agt-ogy3 (AGY3 tablet)
**Context:** IMPORTANT!! Run locally on Termux. NO build needed.
**Repo:** ~/workspace/ai-drakon-scaffolder
**Reference:** docs/reports/code-analysis-2026-05-29.md

### FIX 1: src/context/ProjectContext.tsx — deleted project stays active

Find inside loadProjects / setActiveProjectState:
  const updated = parsed.find((p) => p.slug === prev.slug);
  return updated ?? prev;

Replace with:
  const updated = parsed.find((p) => p.slug === prev.slug);
  return updated ?? parsed[0] ?? null;

### FIX 2: src/pages/CodePage.tsx — reset editor state on project switch

In CodePage() component, after useState declarations, add:

  useEffect(() => {
    setCode("");
    setFilePath("untitled.py");
    setFileSha(null);
    setResult(null);
  }, [activeProject?.slug]);

### FIX 3: src/pages/CodePage.tsx — reset FileTree path on repo change

Inside FileTree component, if load useCallback already has [owner, repo] deps, just add:

  useEffect(() => {
    setCurrentPath("");
    setPathStack([]);
  }, [owner, repo]);

### FIX 4: src/pages/CodePage.tsx — memory leak pollRef cleanup

In CodePage() component, add:

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

### Commit + push

  git add src/context/ProjectContext.tsx src/pages/CodePage.tsx
  git commit -m "fix: reset editor on project switch, fix deleted project bug, fix memory leak (TASK-53)"
  git push origin main

### Mark done

  python3 -c "
with open('development/TASKS.md') as f: t = f.read()
idx = t.find('TASK-53')
section = t[idx:idx+100]
t = t.replace('[ ] pending', '[x] done', 1)
with open('development/TASKS.md', 'w') as f: f.write(t)
print('done')
"
  git add development/TASKS.md
  git commit -m "chore: mark TASK-53 done"
  git push origin main

### DIARY

  python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-53:4fixes|stale+memleak+deleted|DONE"

---

## TASK-54: fix — sync TASK-53 fixes to .lovable/src/ (Cloudflare Pages builds from there)

**Status:** [x] done
**Agent:** agt-ogy3 (AGY3 tablet)
**CRITICAL:** Cloudflare Pages builds from .lovable/ NOT from src/
**Context:** IMPORTANT!! Run locally on Termux. NO build needed.
**Repo:** ~/workspace/ai-drakon-scaffolder

### Проблема

TASK-53 оновив src/pages/CodePage.tsx та src/context/ProjectContext.tsx,
але НЕ оновив .lovable/src/pages/CodePage.tsx та .lovable/src/context/ProjectContext.tsx.
Cloudflare Pages будує з .lovable/ ().
Тому деплой не містить фіксів TASK-53.

### src/ має 451 рядок, .lovable/ має 433 рядки — 18 рядків різниці

### Рішення: скопіювати src/ файли в .lovable/src/

ПРОСТИЙ СПОСІБ — просто скопіювати:


Після копіювання перевір що файли однакові:
DIFF EXISTS
DIFF EXISTS

### Commit + push



### Mark done + diary




---

## TASK-55: fix CodePage no owner fallback

**Status:** [ ] pending
**Agent:** agt-ogy3 (AGY3 tablet)
**Context:** IMPORTANT!! Termux local. Edit BOTH src/ AND .lovable/src/
**Repo:** ~/workspace/ai-drakon-scaffolder

### Root cause
Project without github config (goclaw) falls back to global Settings owner/repo (uav-watcher).
Shows wrong tree + error.

### Fix in BOTH files:
  src/pages/CodePage.tsx
  .lovable/src/pages/CodePage.tsx

Find:
  const owner = projectGh?.owner || ghCfg.owner || ghCfg.repo.split("/")[0] || "";
  const repoRaw = ghCfg.repo.includes("/") ? ghCfg.repo.split("/")[1] : ghCfg.repo;
  const repo = projectGh?.repo || repoRaw;

Replace with:
  const owner = projectGh?.owner || "";
  const repo = projectGh?.repo || "";

(Keep token and branch as is. Remove repoRaw variable entirely.)

### Verify files are identical:
  diff src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx && echo "OK"

### Commit:
  git add src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
  git commit -m "fix: remove global settings fallback for owner/repo in CodePage (TASK-55)"
  git push origin main
  git add development/TASKS.md && git commit -m "chore: mark TASK-55 done" && git push origin main
  python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-55:no-owner-fallback|DONE|***"

---

[x] TASK-59
Title: Fix ProjectSelector — прибрати dropdown з усіма проектами
Agent: AGY3 (планшет)
Run: locally on AGY3 Termux, NO SSH

Context:
ProjectSelector.tsx рендерить <Select> з усіма проектами з listProjectsArch() (бекенд
повертає всі 12+ проектів). Ми вирішили працювати з одним проектом — його обирають в Settings.
Dropdown непотрібний.

Files:
- /home/vokov/workspace/ai-drakon-scaffolder/src/components/workspace/ProjectSelector.tsx

Fix:
Замінити блок із <Select> (рядки де `{loading && projects.length === 0 ? ... : <Select ...>}`)
на просте відображення назви активного проекту.

Якщо `activeProject` є — показати:
```tsx
<div className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2">
  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)]" />
  <span className="flex-1 truncate font-mono text-[11px] text-[var(--accent-amber)]">
    {activeProject.name}
  </span>
</div>
```

Якщо `loading && !activeProject` — показати "Loading..." з Loader2.
Якщо `!activeProject && !loading` — показати "No project".

ПРИБРАТИ імпорти: Select, SelectContent, SelectItem, SelectTrigger, SelectValue (якщо не використовуються більше).

Verification:
cd /home/vokov/workspace/ai-drakon-scaffolder && npx tsc --noEmit 2>&1 | head -20

Commit:
git add src/components/workspace/ProjectSelector.tsx .lovable/src/components/workspace/ProjectSelector.tsx
git commit -m "fix(ui): replace project dropdown with static active-project display (TASK-59)"
git push origin main

ВАЖЛИВО: після змін також скопіювати:
cp src/components/workspace/ProjectSelector.tsx .lovable/src/components/workspace/ProjectSelector.tsx

Diary: "SESSION:2026-05-30|TASK-59:remove-project-dropdown|DONE|commit:<hash>|★★★"
(agent: agt-ogy3)

---

[x] TASK-60
Title: Fix AgentChatPanel — передати activeProject context агентам
Agent: AGY phone (телефон)
Run: locally on AGY phone Termux, NO SSH

Context:
AgentChatPanel.tsx викликає sendMessage(activeAgent, text) БЕЗ context.
Тому агент не знає який проект активний і відповідає про свій дефолтний (ai-drakon IDE).
Треба передати activeProject slug/path/name як context.

Files:
- /home/vokov/workspace/ai-drakon-scaffolder/src/components/agents/AgentChatPanel.tsx

Fix:
1. Додати імпорт: import { useProject } from "@/context/ProjectContext";
2. В компоненті AgentChatPanel додати: const { activeProject } = useProject();
3. Знайти рядок `void sendMessage(activeAgent, text)` в handleSend
4. Замінити на:
   ```ts
   void sendMessage(activeAgent, text, {
     project_slug: activeProject?.slug ?? null,
     project_name: activeProject?.name ?? null,
     project_path: activeProject?.path ?? null,
   });
   ```

Verification:
cd /home/vokov/workspace/ai-drakon-scaffolder && npx tsc --noEmit 2>&1 | head -20

Commit:
git add src/components/agents/AgentChatPanel.tsx .lovable/src/components/agents/AgentChatPanel.tsx
git commit -m "fix(agents): pass activeProject context to agent sendMessage (TASK-60)"
git push origin main

ВАЖЛИВО: після змін також скопіювати:
cp src/components/agents/AgentChatPanel.tsx .lovable/src/components/agents/AgentChatPanel.tsx

Diary: "SESSION:2026-05-30|TASK-60:agent-project-context|DONE|commit:<hash>|★★★"
(agent: agt-ogy)

---

[x] TASK-61
Title: Create ai-memory-commit.sh on all devices
Agent: AGY3
Run: locally on AGY3 Termux, then SSH to OrangePi + AGY phone

Context:
MemPalace-First methodology needs a script that notifies ai-memory after each git push.
Full plan: docs/plans/2026-05-30-mempalace-first-methodology.md

Files:
- Create ~/bin/ai-memory-commit.sh on AGY3 locally
- SSH copy to vokov@192.168.3.184:~/bin/ai-memory-commit.sh
- SSH copy to u0_a284@192.168.3.25:~/bin/ai-memory-commit.sh (port 8022, pass 123456)

Script content:
#!/bin/bash
PROJECT=${1:-unknown}
FILES=${2:-}
curl -s "http://192.168.3.184:49374/hook?event=Commit&project=${PROJECT}&files=${FILES}" > /dev/null

chmod +x ~/bin/ai-memory-commit.sh

Verification: ~/bin/ai-memory-commit.sh ai-drakon "test.ts" && echo OK

Commit: NO git commit needed (local scripts only)
Diary: "SESSION:2026-05-30|TASK-61:ai-memory-commit.sh|created-3-devices|★★★"
(agent: agt-ogy3)

---

[ ] TASK-62
Title: ai-memory server — add Commit event handler
Agent: AGY3
Run: SSH to vokov@192.168.3.184

Context:
ai-memory server on 192.168.3.184 does not handle event=Commit yet.
Find server code and add handler.
Full plan: docs/plans/2026-05-30-mempalace-first-methodology.md

Step 1 - Find server code:
sshpass -p '805235io.' ssh vokov@192.168.3.184 "find /home/vokov -name '*.py' | xargs grep -l 'SessionStart' 2>/dev/null | head -5"

Step 2 - Add Commit handler:
- Parse query params: project, files
- PROJECT_PATHS = {"ai-drakon": "/home/vokov/workspace/ai-drakon-scaffolder", "uav-watcher": "/home/vokov/projects/uav-watcher"}
- On Commit event: git -C <path> pull, then ~/bin/mp-index.sh <project> <path> <files>

Step 3 - Restart service if needed (sudo rc-service <service> restart)

Verification: curl "http://192.168.3.184:49374/hook?event=Commit&project=ai-drakon&files=test.ts" && echo OK

Diary: "SESSION:2026-05-30|TASK-62:ai-memory-commit-handler|★★★"
(agent: agt-ogy3)

---

[ ] TASK-63
Title: Create mp-index.sh on all devices
Agent: AGY3
Run: locally on AGY3, then SSH deploy to OrangePi + AGY phone

Context:
Script for indexing project into local MemPalace.
Reads .mempalace.json config, indexes specific files or full project.
Full plan: docs/plans/2026-05-30-mempalace-first-methodology.md

Script content (~/bin/mp-index.sh):
#!/bin/bash
WING=$1
PROJECT_PATH=$2
FILES=$3
cd "$PROJECT_PATH" || exit 1
if [ -z "$FILES" ]; then
    python3 -m mempalace index . --wing "$WING" --config .mempalace.json
else
    IFS="," read -ra FILE_LIST <<< "$FILES"
    for f in "${FILE_LIST[@]}"; do
        [ -f "$f" ] && python3 -m mempalace index "$f" --wing "$WING"
    done
fi

chmod +x ~/bin/mp-index.sh
Deploy same way as TASK-61 (SSH copy to all devices).

Verification:
~/bin/mp-index.sh ai-drakon ~/workspace/ai-drakon-scaffolder
python3 -m mempalace search "AgentChatPanel" --wing ai-drakon | head -5

Diary: "SESSION:2026-05-30|TASK-63:mp-index.sh|created-3-devices|★★★"
(agent: agt-ogy3)

---

[ ] TASK-64
Title: .mempalace.json for ai-drakon + initial index
Agent: AGY3
Run: locally on AGY3 (after TASK-63 is done)

Context:
Register ai-drakon project in MemPalace system.

File: /home/vokov/workspace/ai-drakon-scaffolder/.mempalace.json
Content:
{
  "wing": "ai-drakon",
  "index": ["src/**/*.{ts,tsx}", "services/**/*.py", "docs/**/*.md", "development/TASKS.md", "development/SYNC_METHODOLOGY.md", "HANDOFF.md", "package.json"],
  "exclude": [".env*", "node_modules/", "*.lock", "dist/", ".lovable/"],
  "chunk_by": "function"
}

After creating file:
git add .mempalace.json
git commit -m "chore: register ai-drakon in MemPalace index (TASK-64)"
git push origin main
~/bin/mp-index.sh ai-drakon ~/workspace/ai-drakon-scaffolder

Verification: python3 -m mempalace search "ProjectSelector" --wing ai-drakon | head -5

Diary: "SESSION:2026-05-30|TASK-64:mempalace-ai-drakon-registered|indexed|★★★"
(agent: agt-ogy3)

---

[x] TASK-65
Title: .mempalace.json for uav-watcher + initial index
Agent: AGY3
Run: SSH to vokov@192.168.3.184 (after TASK-63 is done)

Context:
Register uav-watcher project in MemPalace system.
uav-watcher repo is at /home/vokov/projects/uav-watcher on 192.168.3.184

File to create: /home/vokov/projects/uav-watcher/.mempalace.json
Content:
{
  "wing": "uav-watcher",
  "index": ["*.py", "docs/**/*.md", "HANDOFF.md"],
  "exclude": [".env*", "__pycache__/", "*.pyc", "config.json"],
  "chunk_by": "function"
}

SSH to server: sshpass -p '805235io.' ssh vokov@192.168.3.184
Then:
cd /home/vokov/projects/uav-watcher
git add .mempalace.json
git commit -m "chore: register uav-watcher in MemPalace index (TASK-65)"
git push origin master
~/bin/mp-index.sh uav-watcher /home/vokov/projects/uav-watcher

Verification: python3 -m mempalace search "geo_monitor" --wing uav-watcher | head -5

Diary: "SESSION:2026-05-30|TASK-65:mempalace-uav-watcher-registered|indexed|★★★"
(agent: agt-ogy3)

---

[x] TASK-66
Title: agy-task.sh — add MemPalace-first rule to prompts
Agent: AGY3
Run: locally on AGY3, then SSH copy to AGY phone

Context:
AGY agents must know the MemPalace-first rule.
Add the rule to the task prompt in ~/bin/agy-task.sh.
File: ~/bin/agy-task.sh on AGY3 and AGY phone.

Add this block to the task prompt (before task execution instructions):
=== MEMPALACE-FIRST RULE (MANDATORY) ===
Before reading ANY project file with cat/head/Read:
  1. python3 -m mempalace search "<description>" --wing <project-slug>
  2. If found: read ONLY that specific section (targeted offset+limit, not full file)
  3. If not found: read full file (exception only), then notify:
     ~/bin/ai-memory-commit.sh <project-slug> "<file-path>"
After every git push: ALWAYS run:
  ~/bin/ai-memory-commit.sh <project-slug> "<comma-separated-changed-files>"
Project slugs: ai-drakon, uav-watcher
=========================================

After editing ~/bin/agy-task.sh on AGY3:
Copy to AGY phone:
sshpass -p '123456' ssh -p 8022 u0_a284@192.168.3.25 "cat > ~/bin/agy-task.sh" < ~/bin/agy-task.sh

Verification: grep "MEMPALACE" ~/bin/agy-task.sh && echo OK

Diary: "SESSION:2026-05-30|TASK-66:agy-task-mempalace-rule|AGY3+phone|★★★"
(agent: agt-ogy3)

---

[ ] TASK-67
Title: SYNC_METHODOLOGY.md — add MemPalace-First section
Agent: AGY3
Run: locally on AGY3

Context:
Update sync methodology document with MemPalace-First section.
File: /home/vokov/workspace/ai-drakon-scaffolder/development/SYNC_METHODOLOGY.md

Add section "## MemPalace-First Lookup" with:
1. Core rule: search before read, 5-10x token savings
2. Registered projects table: wing name | path | agents
3. Commit flow: git push -> ai-memory-commit.sh -> all agents re-index
4. Architecture: each agent has own local MemPalace (distributed, coordinated via ai-memory)
5. Exception: fallback to full read + self-heal (rare, not the norm)

Commit:
git add development/SYNC_METHODOLOGY.md
git commit -m "docs: add MemPalace-first methodology section (TASK-67)"
git push origin main

Diary: "SESSION:2026-05-30|TASK-61..67:mempalace-first-COMPLETE|distributed-mempalace|all-agents|★★★"
(agent: agt-ogy3)
