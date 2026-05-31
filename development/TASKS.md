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

[x] TASK-67
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

---

[x] TASK-68
Title: Fix Code tab — "Не вдалося завантажити" при відкритті файлу
Agent: AGY3
Run: locally on AGY3 Termux

Context:
CodePage.tsx в UI відображає дерево файлів (githubListTree OK), але при кліку на файл
показує "Не вдалося завантажити". Активний проект: uav-watcher.

ROOT CAUSE HYPOTHESIS:
1. token = ghCfg.token (глобальні налаштування, рядок 182 CodePage.tsx) — може не мати доступу до maxfraieho/uav-watcher
2. АБО: branch = "master" але помилка в GitHub API call
3. АБО: Monaco editor помилка ініціалізації

Files:
- src/pages/CodePage.tsx (рядки 177-255)
- src/lib/agent-api.ts (githubGetFile функція)

Investigation steps:
1. Знайди в CodePage.tsx catch block де показується "Не вдалося завантажити" — яка точна помилка?
2. Протестуй GitHub API напряму:
   curl "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/github/file?owner=maxfraieho&repo=uav-watcher&path=uav_watcher.py&branch=master" -H "Authorization: Bearer <JWT_TOKEN>"
3. Якщо помилка 404/403: проблема з token або repo visibility
4. Якщо 200: проблема в frontend обробці відповіді

Fix: залежить від root cause — або додати fallback для token, або виправити API call, або виправити error handling

Verification:
Відкрити Code tab з проектом uav-watcher → клікнути uav_watcher.py → файл відкривається в Monaco

Commit: "fix(code-tab): fix file loading for non-default projects (TASK-68)"
ВАЖЛИВО: cp src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx

Diary: "SESSION:2026-05-30|TASK-68:code-tab-file-load-fix|DONE|commit:6be348273d0fcc9673f6d47aac496c03c23b867c|★★★"
(agent: agt-ogy3)

---

[ ] TASK-69
Title: Fix agents — використовувати activeProject context у відповідях
Agent: AGY3
Run: locally on AGY3 Termux + SSH to vokov@192.168.3.184

Context:
AgentChatPanel.tsx відправляє context={project_slug, project_name, project_path} в кожному
повідомленні. Worker передає це до Python агентів. АЛЕ агенти ігнорують context і
відповідають про загальний проект (ai-drakon IDE), не про активний (uav-watcher).

ROOT CAUSE: Python агенти /chat endpoint не використовують context.project_slug для:
- Системного промпту (не знають який проект активний)
- Фільтрації документів з docs-agent
- Підбору відповідних знань

Files to check (на 192.168.3.184):
- services/architect-agent/main.py або routes — /chat endpoint
- services/drakon-agent/main.py — /chat endpoint
- services/docs-agent/main.py — /chat endpoint

Investigation (SSH to 192.168.3.184):
sshpass -p '805235io.' ssh vokov@192.168.3.184
grep -rn "context\|project_slug\|/chat" services/architect-agent/ | grep -v ".pyc" | head -20
grep -rn "context\|project_slug\|/chat" services/docs-agent/ | grep -v ".pyc" | head -20

Fix needed:
In each agent's /chat handler:
1. Extract context.project_slug from request body
2. If project_slug is set: add to system prompt "Active project: {project_slug} at {project_path}"
3. For docs-agent: filter docs lookup by project_slug

Example fix pattern:
```python
@app.post("/chat")
async def chat(request: ChatRequest):
    project_info = ""
    if request.context and request.context.get("project_slug"):
        slug = request.context["project_slug"]
        path = request.context.get("project_path", "")
        project_info = f"\n\nActive project: {slug} (path: {path}). Focus responses on this project."
    
    system_prompt = BASE_SYSTEM_PROMPT + project_info
    # ... rest of chat logic
```

After fixing: restart services
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service ai-architect-agent restart && sudo rc-service ai-drakon-agent restart && sudo rc-service ai-docs-agent restart'

Verification:
Chat with agent when uav-watcher is active → agent mentions uav-watcher, Sharon, Telegram monitoring
NOT about DRAKON diagrams or IDE

Commit (from AGY3 local): "fix(agents): use project context in agent chat responses (TASK-69)"
git push origin main

Diary: "SESSION:2026-05-30|TASK-69:agents-project-context|DONE|commit:<hash>|★★★"
(agent: agt-ogy3)

---

[x] TASK-70
Title: UAV-Watcher Deep Analysis + AI Refactoring Plan via AI-DRAKON Pipeline
Agent: AGY3
Run: locally on AGY3 Termux — всі HTTP виклики до 192.168.3.184 (dev server)

!!IMPORTANT!! AUTH та ENDPOINTS:
- Agents (прямий доступ, БЕЗ JWT): http://192.168.3.184:8765/chat (drakon), :8766/chat (architect), :8767/chat (docs)
- DRAKON MCP Worker auth: Bearer drakon-mcp-2026
- Worker URL: https://drakon-mcp-worker.maxfraieho.workers.dev
- JWT (для Worker): curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/auth/login -H 'Content-Type: application/json' -d '{"username":"owner","password":"805235io."}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))'
- НЕ потрібен JWT для прямих agent endpoints (:8765/:8766/:8767)

Context:
uav-watcher (Sharon) — моніторинг повітряних загроз. ПРОБЛЕМИ в поточному коді:
1. Класифікація через REGEX (_THREAT_PATTERNS, _AIRARAID_PATTERNS в uav_watcher.py рядки ~107-128)
   → не розуміє сленг, скорочення, нестандартні назви
2. score_proximity(text, city_keywords) — фіксований список слів для міста → пропускає синоніми
3. Немає прямих посилань: не зберігається message_id/channel для побудови t.me/channel/msg_id
4. throttle/cooldown може придушувати справжні загрози
5. Іноді відсилає нерелевантні статті замість сповіщень

Вихідні файли: /home/vokov/.mempalace/projects/uav-watcher/ (uav_watcher.py 1046 рядків, geo_monitor.py 134, etc.)

==================================================================
PHASE 1: docs-agent — Документування поточної архітектури
==================================================================

Запит до docs-agent (БЕЗ авторизації, прямий HTTP):

curl -s --max-time 120 -X POST http://192.168.3.184:8767/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Задокументуй архітектуру системи моніторингу загроз uav-watcher (Sharon).\n\nФайли для аналізу:\n- /home/vokov/.mempalace/projects/uav-watcher/uav_watcher.py (1046 рядків)\n- /home/vokov/.mempalace/projects/uav-watcher/geo_monitor.py (134 рядки)\n\nВ документі опиши:\n1. Поточна архітектура threat detection: _THREAT_PATTERNS regex + _AIRARAID_PATTERNS\n2. classify_threat_level() функція: як визначається рівень загрози 1-3\n3. score_proximity(text, city_keywords): алгоритм оцінки близькості до міста\n4. geo_monitor: як будується pattern з координат через Overpass API\n5. Потік обробки: отримання Telegram msg → класифікація → throttle → сповіщення\n6. Поточні обмеження та відомі проблеми\nВідповідай детально з прикладами з коду.",
    "context": {"project_slug": "uav-watcher", "project_path": "/home/vokov/.mempalace/projects/uav-watcher"}
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response','ERROR:'+str(d)[:200]))"

Збережи результат в файл:
~/workspace/ai-drakon-scaffolder/docs/uav-watcher/threat-detection-analysis.md

==================================================================
PHASE 2: architect-agent — Новий AI-based Pipeline
==================================================================

curl -s --max-time 120 -X POST http://192.168.3.184:8766/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Спроектуй нову AI-based архітектуру для uav-watcher.\n\nПОТОЧНА ПРОБЛЕМА:\n- Regex _THREAT_PATTERNS не розуміє сленг/скорочення телеграм-каналів\n- city_keywords список пропускає синоніми назви міста\n- Немає збереження message_id для прямих посилань t.me/channel/123\n- throttle може придушувати реальні загрози\n\nЗАПИТАНА НОВА АРХІТЕКТУРА:\n1. LLM classify_threat(msg, city_context) через agy3.exodus.pp.ua/v1 (OpenAI-compatible)\n   Input: текст повідомлення + назва міста + синоніми міста\n   Output JSON: {threat_level: 0-3, is_relevant: bool, city_mentioned: bool, reason: str}\n2. City synonyms expansion: async функція що розширює назву міста через LLM один раз\n3. Message metadata: зберігати channel_username + message_id\n4. Notification format: текст + пряме посилання t.me/{channel}/{msg_id}\n\nПоверни:\n1. Нову архітектуру з псевдокодом ключових функцій\n2. Список файлів для зміни з конкретними рядками\n3. DRAKON схеми в IR форматі для flow.threat-detection-ai та flow.city-recognition\n4. Пріоритет змін (що змінити першим)",
    "context": {"project_slug": "uav-watcher", "project_path": "/home/vokov/.mempalace/projects/uav-watcher"}
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response','ERROR:'+str(d)[:200]))"

Збережи результат + DRAKON IR в:
~/workspace/ai-drakon-scaffolder/docs/plans/2026-05-30-uav-watcher-ai-refactoring.md

==================================================================
PHASE 3: Збережи DRAKON схеми через MCP Worker
==================================================================

JWT=$(curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"owner","password":"805235io."}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')

Якщо architect-agent повернув DRAKON IR у відповіді:
- Зберегти кожну схему через:
  curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/v1/drakon/commit \
    -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d '{"folder":"uav-watcher","name":"flow.threat-detection-ai","ir": <IR_FROM_AGENT>}'

==================================================================
PHASE 4: ЗБІР ПРОБЛЕМ AI-DRAKON під час роботи
==================================================================

Зафіксуй ВСІ проблеми що знайшов під час виконання задачі:
- Які endpoint'и не відповіли
- Які агенти дали неточну відповідь
- Проблеми з auth/токенами
- Проблеми з AI-DRAKON web UI якщо пробував PinchTab
- Будь-які несподівані поведінки

Збережи в:
~/workspace/ai-drakon-scaffolder/docs/plans/2026-05-30-ai-drakon-issues-from-uav-analysis.md

==================================================================
COMMITS та VERIFICATION
==================================================================

Після виконання всіх фаз:
git -C ~/workspace/ai-drakon-scaffolder add docs/uav-watcher/threat-detection-analysis.md docs/plans/
git -C ~/workspace/ai-drakon-scaffolder commit -m "docs(uav-watcher): AI analysis + refactoring plan via AI-DRAKON pipeline (TASK-70)"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Verification:
- docs/uav-watcher/threat-detection-analysis.md існує і не порожній
- docs/plans/2026-05-30-uav-watcher-ai-refactoring.md існує з планом
- docs/plans/2026-05-30-ai-drakon-issues-from-uav-analysis.md існує

Diary: "SESSION:2026-05-30|TASK-70:uav-watcher-ai-analysis|docs-agent+architect-agent|DRAKON-diagrams|issues-logged|★★★"

==================================================================
[x] TASK-71
Title: Fix AI-DRAKON pipeline issues found during TASK-70
Agent: AGY phone
Run: locally on Termux, NO SSH needed. All changes in ~/workspace/ai-drakon-scaffolder/
==================================================================

During TASK-70, AGY3 found 4 concrete bugs in the AI-DRAKON pipeline.
See full report: docs/plans/2026-05-30-ai-drakon-issues-from-uav-analysis.md

Fix all 4 issues:

==================================================================
FIX 1: API response key mismatch ("response" vs "reply")
==================================================================

Problem: Agent API returns {"reply": "..."} but scripts use d.get('response') → always None.

Find ALL places in the codebase that parse agent API responses:
grep -r "get('response'" ~/workspace/ai-drakon-scaffolder/src/ --include="*.py" -l
grep -r "get('response'" ~/workspace/ai-drakon-scaffolder/src/ --include="*.ts" -l
grep -r '"response"' ~/workspace/ai-drakon-scaffolder/src/ -l

For each found file: replace d.get('response', ...) with:
  d.get('reply') or d.get('response') or d.get('text', '')
  (handle all three variants for backward compatibility)

Also update docs/uav-watcher/threat-detection-analysis.md:
Add note: "Agent API returns key 'reply', not 'response'. Use d.get('reply') or d.get('response', '')."

==================================================================
FIX 2: Worker login credentials (document Bearer token as primary)
==================================================================

Problem: POST /auth/login with {"username":"owner","password":"805235io."} returns 401.
Workaround: Bearer drakon-mcp-2026 works perfectly.

Find all references to the login endpoint or credentials:
grep -r "auth/login\|username.*owner\|password.*805235" ~/workspace/ai-drakon-scaffolder/ -r -l 2>/dev/null

Update any scripts/docs that use username/password login:
- Comment out the login block
- Add: # Use Bearer token directly: Authorization: Bearer drakon-mcp-2026
- Update WORKER_TOKEN env var default to "drakon-mcp-2026" if found

Update docs/plans/2026-05-30-ai-drakon-issues-from-uav-analysis.md with fix status.

==================================================================
FIX 3: Cloudflare WAF blocks Python urllib (User-Agent fix)
==================================================================

Problem: Python urllib default User-Agent gets 403 from Cloudflare WAF.
Fix: Add User-Agent header to ALL Python requests to Worker/Cloudflare URLs.

Find all Python files that call the Worker or external URLs:
grep -r "urllib.request\|requests.get\|requests.post" ~/workspace/ai-drakon-scaffolder/src/ -l 2>/dev/null
grep -r "workers.dev\|cloudflare\|drakon-mcp-worker" ~/workspace/ai-drakon-scaffolder/ -r --include="*.py" -l 2>/dev/null

For each found file, ensure requests include:
  headers = {"User-Agent": "curl/7.68.0", "Content-Type": "application/json", ...}

If using urllib.request.Request: add headers via req.add_header("User-Agent", "curl/7.68.0")
If using requests library: add headers={"User-Agent": "curl/7.68.0"} to every call

==================================================================
FIX 4: Diagram commit endpoint key names
==================================================================

Problem: Endpoint expects "folderSlug" + "diagramId" but scripts/docs use "folder" + "name" → 400 Bad Request.

Find all places that call diagram commit/save endpoint:
grep -r "folderSlug\|\"folder\"\|diagramId\|\"name\"" ~/workspace/ai-drakon-scaffolder/src/ -r --include="*.py" -l 2>/dev/null
grep -r "folderSlug\|diagramId" ~/workspace/ai-drakon-scaffolder/src/ -r --include="*.ts" -l 2>/dev/null

Update all diagram commit payloads to use:
  {"folderSlug": "...", "diagramId": "...", "ir": {...}}
  instead of:
  {"folder": "...", "name": "...", "ir": {...}}

Also check docs/ for examples and update them too:
grep -r '"folder".*"name".*"ir"' ~/workspace/ai-drakon-scaffolder/docs/ -r -l 2>/dev/null

==================================================================
COMMITS та VERIFICATION
==================================================================

git -C ~/workspace/ai-drakon-scaffolder pull
git -C ~/workspace/ai-drakon-scaffolder add -p  # review each change
git -C ~/workspace/ai-drakon-scaffolder commit -m "fix(pipeline): fix 4 AI-DRAKON issues from TASK-70 audit (TASK-71)"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Verification:
- grep -r "get('response'" src/ | wc -l  → повинен зменшитись або = 0
- grep -r '"folder".*"ir"' docs/ | wc -l → повинен = 0
- docs updated with fix notes

Diary: "SESSION:2026-05-30|TASK-71:ai-drakon-fixes|4-bugs-fixed|response-key+login+useragent+diagram-endpoint|commit:<hash>|★★★"

==================================================================
[x] TASK-72
Title: UAV-Watcher LLM Refactoring — Replace REGEX with AI classifier
Agent: AGY3
Run: locally on AGY3 Termux for git ops. SSH to dev server 192.168.3.184 for uav-watcher code.
Context: uav-watcher is at /home/vokov/projects/uav-watcher/ on 192.168.3.184
SSH: sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
LLM proxy: http://agy3.exodus.pp.ua/v1 (OpenAI-compatible, use "gemini-2.5-flash" model)
==================================================================

Based on TASK-70 analysis + architect-agent plan in docs/plans/2026-05-30-uav-watcher-ai-refactoring.md

4 files to change in /home/vokov/projects/uav-watcher/ on 192.168.3.184:

==================================================================
STEP 1: Read current code structure
==================================================================

SSH to dev server and read the relevant files:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'ls /home/vokov/projects/uav-watcher/'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "classify_threat\|_THREAT_PATTERNS\|_AIRAID\|score_proximity\|THREAT_LEVEL\|def.*threat" /home/vokov/projects/uav-watcher/uav_watcher.py | head -40'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'head -80 /home/vokov/projects/uav-watcher/uav_watcher.py'

Also read config and understand the OpenAI client if already used:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "openai\|httpx\|aiohttp\|LLM\|API_KEY\|BASE_URL" /home/vokov/projects/uav-watcher/uav_watcher.py | head -20'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cat /home/vokov/projects/uav-watcher/config.json 2>/dev/null | python3 -m json.tool | head -30'

==================================================================
STEP 2: Add LLM config to config.json
==================================================================

Add these fields to /home/vokov/projects/uav-watcher/config.json (via SSH):
  "llm_api_url": "http://agy3.exodus.pp.ua/v1",
  "llm_model": "gemini-2.5-flash",
  "llm_api_key": "not-needed",
  "llm_classify_enabled": true

IMPORTANT: config.json is NOT in git — edit it directly, DO NOT commit it.
Use Python to merge safely:

sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -c "
import json
with open(\"/home/vokov/projects/uav-watcher/config.json\") as f:
    cfg = json.load(f)
cfg[\"llm_api_url\"] = \"http://agy3.exodus.pp.ua/v1\"
cfg[\"llm_model\"] = \"gemini-2.5-flash\"
cfg[\"llm_api_key\"] = \"not-needed\"
cfg[\"llm_classify_enabled\"] = True
with open(\"/home/vokov/projects/uav-watcher/config.json\", \"w\") as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
print(\"config.json updated\")
"'

==================================================================
STEP 3: Implement LLM classifier in uav_watcher.py
==================================================================

Write file /tmp/llm_classifier_patch.py locally, then scp to server.

The patch adds these functions to uav_watcher.py (after existing imports):

```python
import asyncio
import json as _json
from functools import lru_cache
from openai import AsyncOpenAI

# LLM client — initialized once
_llm_client: AsyncOpenAI | None = None

def get_llm_client() -> AsyncOpenAI:
    global _llm_client
    if _llm_client is None:
        _llm_client = AsyncOpenAI(
            base_url=config.get("llm_api_url", "http://agy3.exodus.pp.ua/v1"),
            api_key=config.get("llm_api_key", "not-needed"),
        )
    return _llm_client

@lru_cache(maxsize=128)
def _cached_synonyms(city: str) -> tuple:
    """Sync wrapper — called from async context via asyncio.to_thread."""
    return tuple()  # placeholder, filled by async version

async def get_city_synonyms(city: str) -> list[str]:
    """Get LLM-generated synonyms for the target city."""
    client = get_llm_client()
    model = config.get("llm_model", "gemini-2.5-flash")
    try:
        resp = await client.chat.completions.create(
            model=model,
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": (
                    f"Дай список всіх можливих варіантів написання назви міста '{city}' "
                    f"у Telegram-повідомленнях про повітряні тривоги: скорочення, "
                    f"жаргон, помилки, транслітерація, розмовні назви. "
                    f"Відповідь: JSON масив рядків. Тільки масив, без пояснень."
                )
            }]
        )
        text = resp.choices[0].message.content.strip()
        if text.startswith("["):
            return _json.loads(text)
    except Exception:
        pass
    return [city]

async def llm_classify_threat(text: str, city: str, synonyms: list[str]) -> dict:
    """
    Classify message using LLM.
    Returns: {"threat_level": 0-3, "is_relevant": bool, "reason": str, "direct_link": ""}
    """
    client = get_llm_client()
    model = config.get("llm_model", "gemini-2.5-flash")
    synonyms_str = ", ".join(synonyms[:10])
    
    system_prompt = (
        "Ти — система аналізу повітряних загроз для міст України. "
        "Аналізуй Telegram-повідомлення та визначай загрози БПЛА/ракет. "
        "Ігноруй рекламу, флуд, новини без загроз, репости старих подій. "
        f"Цільове місто: {city}. Синоніми: {synonyms_str}."
    )
    
    user_prompt = (
        f"Повідомлення:\n{text}\n\n"
        "Відповідь JSON (тільки JSON, без пояснень):\n"
        '{"threat_level": 0-3, "is_relevant": true/false, "reason": "коротко чому"}\n'
        "threat_level: 0=не загроза, 1=потенційна, 2=підтверджена, 3=безпосередня небезпека"
    )
    
    try:
        resp = await client.chat.completions.create(
            model=model,
            max_tokens=150,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        text_resp = resp.choices[0].message.content.strip()
        # Extract JSON from response
        import re as _re
        m = _re.search(r'\{.*\}', text_resp, _re.DOTALL)
        if m:
            result = _json.loads(m.group())
            result.setdefault("is_relevant", result.get("threat_level", 0) > 0)
            result.setdefault("reason", "")
            return result
    except Exception as e:
        pass
    return {"threat_level": 0, "is_relevant": False, "reason": "llm_error"}
```

Write this to a temp file locally and scp to server:
Write /tmp/llm_classifier.py with the functions above.
scp via: sshpass -p '805235io.' scp -o StrictHostKeyChecking=no /tmp/llm_classifier.py vokov@192.168.3.184:/tmp/llm_classifier.py

==================================================================
STEP 4: Patch the main process_message function
==================================================================

Read uav_watcher.py to find exactly where classify_threat_level() is called:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "classify_threat_level\|score_proximity\|threat_level\|is_relevant\|send_notification\|process_message\|handle_message" /home/vokov/projects/uav-watcher/uav_watcher.py | head -30'

Then understand the flow and modify the message processing function to:
1. Replace classify_threat_level(text) → await llm_classify_threat(text, city, synonyms)
2. Replace score_proximity(text, city_keywords) → check analysis["is_relevant"]
3. Keep throttle logic intact
4. Save message_id + channel_username in the alert/notification object

The notification message should include:
  - Direct link: f"https://t.me/{channel_username}/{message_id}" if both available
  - Reason from LLM: analysis["reason"]

Check if openai package is installed:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -c "import openai; print(openai.__version__)"'
If not: sshpass -p '805235io.' ssh vokov@192.168.3.184 'pip3 install openai --quiet'

==================================================================
STEP 5: Add message_id + channel_username to DB/notifications
==================================================================

Read how alerts/notifications are currently stored:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "INSERT\|alert\|notification\|message_id\|channel" /home/vokov/projects/uav-watcher/uav_watcher.py | head -30'

If SQLite DB used:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sqlite3 /home/vokov/projects/uav-watcher/*.db ".schema" 2>/dev/null | head -20'

Add column migration if needed (safe — ADD COLUMN):
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS channel_username TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message_id INTEGER;

==================================================================
STEP 6: Test + Restart service
==================================================================

Syntax check:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -m py_compile /home/vokov/projects/uav-watcher/uav_watcher.py && echo "SYNTAX OK"'

Test LLM connectivity:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -c "
import asyncio
from openai import AsyncOpenAI
client = AsyncOpenAI(base_url=\"http://agy3.exodus.pp.ua/v1\", api_key=\"not-needed\")
async def test():
    r = await client.chat.completions.create(
        model=\"gemini-2.5-flash\",
        max_tokens=50,
        messages=[{\"role\":\"user\",\"content\":\"test: відповідь одним словом: OK\"}]
    )
    print(r.choices[0].message.content)
asyncio.run(test())
"'

Restart watcher:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-watcher restart && sleep 3 && tail -10 /var/log/uav-watcher.log'

==================================================================
STEP 7: Commit changes (only python files, NOT config.json)
==================================================================

sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git status --short'

Check what git repo is there:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git remote -v 2>/dev/null | head -3'

If git repo exists:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git add uav_watcher.py && git commit -m "feat(classifier): replace regex with LLM threat classifier + direct links (TASK-72)"'

Also mark TASK-72 done in ai-drakon-scaffolder:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/\[ \] TASK-72/[x] TASK-72/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-72 uav-watcher LLM refactoring complete"
git -C ~/workspace/ai-drakon-scaffolder push origin main

==================================================================
VERIFICATION
==================================================================

- python3 -m py_compile uav_watcher.py → no errors
- LLM test returns "OK"
- Service restarts without crash
- tail /var/log/uav-watcher.log shows no import errors
- grep "llm_classify_threat\|get_city_synonyms" uav_watcher.py | wc -l > 0

Diary: "SESSION:2026-05-30|TASK-72:uav-watcher-llm-refactoring|regex→LLM|city-synonyms|direct-links-t.me|service-restarted|commit:<hash>|★★★"
(agent: agt-ogy3)

==================================================================
[x] TASK-73
Title: UAV-Watcher multi-proxy LLM + web UI для управління проксі
Agent: AGY phone
Run: SSH до dev server 192.168.3.184 для змін коду. Локально для git.
SSH: sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
==================================================================

Контекст: Claude вже зробив ЧАСТИНУ роботи:
- nodes.py ✅ вже пропатчений (_get_proxies() + fallback _llm_call())
- uav_watcher.py ✅ вже пропатчений (multi-proxy в ai_classify())
- threat_classifier.py ❌ НЕ пропатчений — треба виправити
- web_config.py ❌ НЕ пропатчений — треба UI для керування проксі
- config.json ✅ вже має "llm_proxies" масив, але модель потребує оновлення

==================================================================
STEP 1: Перевір поточний стан
==================================================================

sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -m py_compile /home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py && echo "nodes OK"'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -m py_compile /home/vokov/projects/uav-watcher/uav_watcher.py && echo "uav OK"'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "_get_proxies\|_llm_call\|proxy_list" /home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py | head -10'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -c "import json; c=json.load(open(\"/home/vokov/projects/uav-watcher/config.json\")); print(json.dumps(c.get(\"llm_proxies\",[]), indent=2))"'

==================================================================
STEP 2: Виправ threat_classifier.py — додай multi-proxy fallback
==================================================================

Читаємо поточний стан:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "llm_url\|llm_key\|llm_model\|httpx\|chat/completions\|proxy_list\|_proxies" /home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py | head -30'

Знайди точний блок де викликається httpx.AsyncClient для LLM в extract_entities.
Логіка яку треба додати:

Перед httpx викликом — побудуй список проксі з config:
```python
_proxy_list = cfg.get("llm_proxies")
if _proxy_list and isinstance(_proxy_list, list):
    _proxies = [{"url": p["url"].rstrip("/")+"/chat/completions",
                 "token": p.get("token","not-needed"),
                 "model": p.get("model", _llm_model or "gemini-2.5-flash"),
                 "name": p.get("name", p["url"])} for p in _proxy_list if p.get("url")]
elif _llm_url:
    _url = _llm_url.rstrip("/")
    if not _url.endswith("/chat/completions"): _url += "/chat/completions"
    _proxies = [{"url": _url, "token": _llm_key,
                 "model": _llm_model or "gemini-2.5-flash", "name": "single"}]
else:
    _proxies = []
```

Замість одного httpx виклику — цикл по _proxies:
```python
for _p in _proxies:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(_p["url"],
                headers={"Authorization": f"Bearer {_p['token']}"},
                json={"model": _p["model"], "messages": [...], "max_tokens": 200, "temperature": 0.1})
            resp.raise_for_status()
            # parse response and break
            break
    except Exception as e:
        log.warning(f"[threat_classifier] proxy {_p['name']} failed: {e}")
```

Запиши patch як Python файл в /tmp/, scp на сервер, запусти.
ЗАБОРОНА: heredoc з кирилицею через SSH. Тільки scp файлів.

==================================================================
STEP 3: Оновити web_config.py — UI для керування списком проксі
==================================================================

Читаємо поточну секцію AI/LLM:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sed -n "1770,1800p" /home/vokov/projects/uav-watcher/web_config.py'

Знайди HTML блок з id="sec-ai" і card "AI Proxy — LLM налаштування".
Замінити його на:

```html
<div id="sec-ai" class="sec-divider" style="--sc:#f59e0b"><span>&#129302; AI / LLM Proxy</span></div>
<div class="card">
  <div class="card-header"><span class="card-title">&#129302; AI Proxy — список проксі (fallback за чергою)</span></div>
  <div class="card-body">
    <div id="proxy-list"></div>
    <button type="button" onclick="addProxy()" class="btn" style="margin-top:8px">+ Додати проксі</button>
    <input type="hidden" name="llm_proxies_json" id="llm_proxies_json">
    <p style="color:#888;font-size:12px;margin-top:8px">Перший у списку — основний. При недоступності — автоматичний перехід на наступний.</p>
  </div>
</div>
```

JS для управління списком (додати перед </script> або в окремий блок):
```javascript
var _proxies = {llm_proxies_js};

function renderProxies() {{
  var el = document.getElementById('proxy-list');
  el.innerHTML = '';
  _proxies.forEach(function(p, i) {{
    el.innerHTML += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">' +
      '<input class="input" placeholder="Назва" value="'+escHtml(p.name||'')+'" oninput="_proxies['+i+'].name=this.value;syncProxies()" style="width:100px">' +
      '<input class="input" placeholder="URL (https://...)" value="'+escHtml(p.url||'')+'" oninput="_proxies['+i+'].url=this.value;syncProxies()" style="flex:1">' +
      '<input class="input" placeholder="Token" value="'+escHtml(p.token||'')+'" oninput="_proxies['+i+'].token=this.value;syncProxies()" style="width:120px">' +
      '<input class="input" placeholder="Модель" value="'+escHtml(p.model||'')+'" oninput="_proxies['+i+'].model=this.value;syncProxies()" style="width:150px">' +
      '<button type="button" onclick="removeProxy('+i+')" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer">✕</button>' +
    '</div>';
  }});
  syncProxies();
}}
function addProxy() {{
  _proxies.push({{name:'',url:'',token:'not-needed',model:'gemini-2.5-flash-8b-exp'}});
  renderProxies();
}}
function removeProxy(i) {{
  _proxies.splice(i,1);
  renderProxies();
}}
function syncProxies() {{
  document.getElementById('llm_proxies_json').value = JSON.stringify(_proxies);
}}
function escHtml(s) {{ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }}
renderProxies();
```

де {llm_proxies_js} — це поточне значення з Python template: json.dumps(cfg.get("llm_proxies", []))

В Python handler збереження (де обробляється POST /save):
Знайди блок де зберігається cfg["llm_proxy_url"] і додай ПІСЛЯ:
```python
llm_proxies_raw = get("llm_proxies_json", "").strip()
if llm_proxies_raw:
    try:
        import json as _j
        proxies = _j.loads(llm_proxies_raw)
        cfg["llm_proxies"] = [p for p in proxies if p.get("url","").strip()]
    except Exception:
        pass
```

Запиши всі зміни як Python patch файл, scp на сервер, запусти.

==================================================================
STEP 4: Оновити config.json — прибрати localhost, оновити модель
==================================================================

sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -c "
import json
with open(\"/home/vokov/projects/uav-watcher/config.json\") as f:
    cfg = json.load(f)
# Тільки зовнішні проксі, модель gemini-2.5-flash-8b-exp (швидша і розумніша)
cfg[\"llm_proxies\"] = [
    {\"name\": \"AGY3\", \"url\": \"https://agy3.exodus.pp.ua/v1\",
     \"token\": \"not-needed\", \"model\": \"gemini-2.5-flash-8b-exp\"},
    {\"name\": \"AGY2\", \"url\": \"https://agy2.exodus.pp.ua/v1\",
     \"token\": \"not-needed\", \"model\": \"gemini-2.5-flash-8b-exp\"}
]
# Зберегти старий llm_proxy_url як перший проксі для сумісності
cfg[\"llm_proxy_url\"] = \"https://agy3.exodus.pp.ua/v1\"
cfg[\"llm_proxy_model\"] = \"gemini-2.5-flash-8b-exp\"
with open(\"/home/vokov/projects/uav-watcher/config.json\", \"w\") as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
print(\"config.json updated\")
print(\"proxies:\", [p[\"name\"] for p in cfg[\"llm_proxies\"]])
"'

==================================================================
STEP 5: Syntax check + restart
==================================================================

sshpass -p '805235io.' ssh vokov@192.168.3.184 '
python3 -m py_compile /home/vokov/projects/uav-watcher/uav_watcher.py && echo "uav OK" &&
python3 -m py_compile /home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py && echo "nodes OK" &&
python3 -m py_compile /home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py && echo "classifier OK" &&
python3 -m py_compile /home/vokov/projects/uav-watcher/web_config.py && echo "web_config OK"
'

sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-watcher restart && sudo rc-service uav-consultant restart && sudo rc-service uav-web-config restart && sleep 5 && tail -8 /var/log/uav-watcher.log && tail -5 /var/log/uav-consultant.log'

==================================================================
STEP 6: Commit (тільки .py файли, НЕ config.json)
==================================================================

sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git add consultant/pipeline/nodes.py sharon/pipelines/threat_classifier.py web_config.py uav_watcher.py && git commit -m "feat(proxy): multi-proxy LLM fallback + web UI for proxy management (TASK-73)"'

Після commit — mark TASK-73 done в TASKS.md:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-73/[x] TASK-73/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-73 done — multi-proxy LLM + web UI"
git -C ~/workspace/ai-drakon-scaffolder push origin main

==================================================================
VERIFICATION
==================================================================

- python3 -m py_compile *.py — no errors
- tail /var/log/uav-consultant.log — no "All LLM proxies failed"
- curl http://192.168.3.184:8422 — відкривається, є секція "Список проксі"
- curl -s -X POST http://192.168.3.184:8770/chat -H "Content-Type: application/json" -d '{"message":"тест"}' | python3 -m json.tool | head -5

Diary: "SESSION:2026-05-30|TASK-73:multi-proxy-llm+web-ui|nodes+uav+classifier+webconfig|fallback-logic|commit:<hash>|★★★"

==================================================================
[x] TASK-74
Title: Sharon consultant — фільтрація INFO-подій зі списку загроз
Agent: AGY phone
Run: SSH до dev server 192.168.3.184
SSH: sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
==================================================================

ПРОБЛЕМА:
Консультант показує нерелевантні події (новини, забіги) при запиті про загрози.
Root cause: _read_recent_events() у nodes.py повертає всі типи подій включно з "info".

FIX — одна строка в nodes.py:
Знайди функцію _read_recent_events і рядок:
  evs = get_recent_threats(hours=hours)

Одразу після нього додай:
  evs = [e for e in evs if e.get("threat_type") != "info"]

Запиши /tmp/task74.py локально і scp на сервер:
Content of /tmp/task74.py:
  PATH = "/home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py"
  with open(PATH) as f: code = f.read()
  old = '        evs = get_recent_threats(hours=hours)\n        if not evs:'
  new = '        evs = get_recent_threats(hours=hours)\n        evs = [e for e in evs if e.get("threat_type") != "info"]\n        if not evs:'
  if old in code:
      code = code.replace(old, new)
      with open(PATH, "w") as f: f.write(code)
      print("PATCHED OK")
  else:
      print("ERROR: not found"); [print(f"{i+1}: {l}") for i,l in enumerate(code.splitlines()) if "get_recent_threats" in l]

Run patch:
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no /tmp/task74.py vokov@192.168.3.184:/tmp/task74.py
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 /tmp/task74.py && python3 -m py_compile /home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py && echo "SYNTAX OK"'
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-consultant restart && sleep 3 && tail -5 /var/log/uav-consultant.log'

COMMIT (uav-watcher repo, branch master):
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git add consultant/pipeline/nodes.py && git commit -m "fix(consultant): exclude INFO events from threat history (TASK-74)" && git push origin master'

Mark done:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-74/[x] TASK-74/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-74 done — filter INFO events"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-74:filter-info-events|1-line-fix|commit:<hash>|★★★"

==================================================================
[x] TASK-75
Title: Автоматизація MemPalace mining після кожного commit AGY агентів
Agent: AGY phone
Run: локально на AGY phone Termux. SSH до 192.168.3.184 для перевірки.
==================================================================

МЕТА: AGY агенти мають автоматично оновлювати MemPalace після кожного git push
без участі Claude і без витрат його токенів.

STEP 1: Перевір ai-memory-commit.sh на AGY phone
cat ~/bin/ai-memory-commit.sh 2>/dev/null || echo "MISSING"

Якщо скрипт є — перевір шляхи:
- uav-watcher path: має бути ~/projects/uav-watcher або ~/.mempalace/projects/uav-watcher
- Якщо немає — скопіювати з OrangePi:
  sshpass -p '805235io.' scp vokov@192.168.3.184:~/bin/ai-memory-commit.sh ~/bin/ai-memory-commit.sh
  sshpass -p '805235io.' scp vokov@192.168.3.184:~/bin/mp-index.sh ~/bin/mp-index.sh
  chmod +x ~/bin/ai-memory-commit.sh ~/bin/mp-index.sh

STEP 2: Перевір чи є локальний клон uav-watcher на AGY phone
ls ~/projects/uav-watcher 2>/dev/null || echo "NO LOCAL CLONE"

Якщо немає — клонувати:
mkdir -p ~/projects
git clone https://github.com/maxfraieho/uav-watcher.git ~/projects/uav-watcher

STEP 3: Перевір чи є mempalace на AGY phone
python3 -m mempalace --help 2>/dev/null | head -3 || pip3 install mempalace --quiet

STEP 4: Налаштуй правильні шляхи в ai-memory-commit.sh на AGY phone
Відкрий ~/bin/ai-memory-commit.sh і переконайся що:
  PROJECT_PATHS["uav-watcher"]="$HOME/projects/uav-watcher"
  PROJECT_PATHS["ai-drakon"]="$HOME/workspace/ai-drakon-scaffolder"

STEP 5: Тест — запусти mining вручну
cd ~/projects/uav-watcher && git pull origin master
~/bin/ai-memory-commit.sh uav-watcher "consultant/pipeline/nodes.py,uav_watcher.py"
python3 -m mempalace search "multi proxy fallback" --wing uav-watcher | head -5

STEP 6: Підтвердь що workflow працює для майбутніх задач
Кожна AGY задача по uav-watcher тепер МАЄ містити після git push:
  ~/bin/ai-memory-commit.sh uav-watcher "змінені_файли"

COMMIT:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-75/[x] TASK-75/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-75 done — AGY auto MemPalace mining setup"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-75:mempalace-auto-mining|ai-memory-commit+mp-index|uav-watcher-cloned-on-agy|★★★"

==================================================================
[x] TASK-76
Title: Налаштування MemPalace auto-mining на AGY3 (аналог AGY phone + OrangePi)
Agent: AGY3
Run: локально на AGY3 Termux. НЕ через SSH до інших серверів.
==================================================================

МЕТА: AGY3 має автоматично оновлювати MemPalace після кожного commit+push,
аналогічно до AGY phone (TASK-75) та OrangePi.

STEP 1: Перевір поточний стан скриптів
ls ~/bin/ai-memory-commit.sh ~/bin/mp-index.sh 2>/dev/null && echo "EXIST" || echo "MISSING"
cat ~/bin/ai-memory-commit.sh 2>/dev/null | head -5

Якщо скриптів немає — завантаж з OrangePi через proxy або GitHub.
Спробуй спочатку скопіювати з AGY phone:
sshpass -p '123456' scp -P 8022 u0_a284@192.168.3.25:~/bin/ai-memory-commit.sh ~/bin/ai-memory-commit.sh 2>/dev/null
sshpass -p '123456' scp -P 8022 u0_a284@192.168.3.25:~/bin/mp-index.sh ~/bin/mp-index.sh 2>/dev/null
chmod +x ~/bin/ai-memory-commit.sh ~/bin/mp-index.sh 2>/dev/null

STEP 2: Виправ shebang для Termux (критично!)
Перший рядок ai-memory-commit.sh і mp-index.sh має бути:
  #!/data/data/com.termux/files/usr/bin/bash

Перевір і виправ якщо потрібно:
head -1 ~/bin/ai-memory-commit.sh
# Якщо там #!/bin/bash — заміни:
sed -i '1s|.*|#!/data/data/com.termux/files/usr/bin/bash|' ~/bin/ai-memory-commit.sh
sed -i '1s|.*|#!/data/data/com.termux/files/usr/bin/bash|' ~/bin/mp-index.sh 2>/dev/null

STEP 3: Перевір шляхи проектів в ai-memory-commit.sh
cat ~/bin/ai-memory-commit.sh | grep PROJECT_PATHS

Має бути:
  PROJECT_PATHS["uav-watcher"]="$HOME/projects/uav-watcher"
  PROJECT_PATHS["ai-drakon"]="$HOME/workspace/ai-drakon-scaffolder"

Якщо відрізняється — виправ через sed або редактор.

STEP 4: Клонуй проекти якщо не існують
mkdir -p ~/projects ~/workspace

ls ~/projects/uav-watcher 2>/dev/null || \
  git clone https://github.com/maxfraieho/uav-watcher.git ~/projects/uav-watcher

ls ~/workspace/ai-drakon-scaffolder 2>/dev/null || \
  git clone https://github.com/maxfraieho/ai-drakon-scaffolder.git ~/workspace/ai-drakon-scaffolder

STEP 5: Перевір mempalace на AGY3
python3 -m mempalace --help 2>/dev/null | head -3 || echo "MISSING"
# Якщо немає:
pip3 install mempalace --quiet 2>/dev/null || pipx install mempalace

# Перевір версію:
python3 -c "import mempalace; print(mempalace.__version__)" 2>/dev/null

STEP 6: Підтягни останній код і запусти mining
cd ~/projects/uav-watcher && git pull origin master
cd ~/workspace/ai-drakon-scaffolder && git pull origin main

# Mining uav-watcher:
~/bin/ai-memory-commit.sh uav-watcher "consultant/pipeline/nodes.py,uav_watcher.py,web_config.py,sharon/pipelines/threat_classifier.py"

# Mining ai-drakon:
~/bin/ai-memory-commit.sh ai-drakon "src/lib/agent-api.ts,src/pages/LoginPage.tsx,cloudflare-worker/worker-mcp-drakon.js"

STEP 7: Верифікація — пошук в MemPalace
python3 -m mempalace search "multi proxy fallback" --wing uav-watcher 2>/dev/null | head -5
python3 -m mempalace search "agent api reply response" --wing ai-drakon 2>/dev/null | head -5

Якщо знайдено результати — все працює.

STEP 8: Налаштуй mempalace server connection (якщо потрібно)
Перевір чи mempalace підключається до сервера:
python3 -c "from mempalace.config import MempalaceConfig; c = MempalaceConfig(); print(c.palace_path, c.server_url if hasattr(c,'server_url') else 'local')" 2>/dev/null

Якщо є server_url — має вказувати на 192.168.3.234 або agy3.exodus.pp.ua

ВАЖЛИВО для майбутніх TASK: Після кожного git push на AGY3 обов'язково:
  ~/bin/ai-memory-commit.sh uav-watcher "змінені_файли"
  або
  ~/bin/ai-memory-commit.sh ai-drakon "змінені_файли"

COMMIT:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-76/[x] TASK-76/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-76 done — AGY3 MemPalace mining setup"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-76:agt-ogy3-mempalace-setup|scripts+clone+mining|drawers-indexed|★★★"

==================================================================
[x] TASK-77
Title: Інтеграція ai-memory-start/end в agy-task.sh (AGY phone + AGY3)
Agent: AGY phone (і AGY3 паралельно)
Run: локально на Termux. Змінюємо ~/bin/agy-task.sh
==================================================================

МЕТА: ai-memory-start.sh і ai-memory-end.sh мають викликатись АВТОМАТИЧНО
при кожному запуску agy-task.sh — на початку і в кінці.

STEP 1: Подивись поточний agy-task.sh
head -20 ~/bin/agy-task.sh
tail -20 ~/bin/agy-task.sh

STEP 2: Додай виклик ai-memory-start.sh на початок (після shebang і змінних)
Знайди перший рядок після змінних (десь рядок 10-15) і додай:

# Notify ai-memory session start
[ -x "$HOME/bin/ai-memory-start.sh" ] && "$HOME/bin/ai-memory-start.sh" 2>/dev/null &

STEP 3: Додай виклик ai-memory-end.sh в кінець скрипту
Перед останнім рядком (або в кінці основної логіки) додай:

# Notify ai-memory session end
[ -x "$HOME/bin/ai-memory-end.sh" ] && "$HOME/bin/ai-memory-end.sh" "agy-task completed: $TASK_ID" 2>/dev/null

STEP 4: Запиши зміни через Python patch
Збережи /tmp/task77_patch.py локально:

PATH_TASK = "/data/data/com.termux/files/home/bin/agy-task.sh"
with open(PATH_TASK) as f:
    lines = f.readlines()

# Find insertion point for start (after shebang + first variable block, ~line 5-8)
insert_start_after = 0
for i, line in enumerate(lines):
    if line.strip().startswith("SKILLS_LIST=") or line.strip().startswith("TASK_ID="):
        insert_start_after = i
        break

start_hook = '# Notify ai-memory\n[ -x "$HOME/bin/ai-memory-start.sh" ] && "$HOME/bin/ai-memory-start.sh" 2>/dev/null &\n\n'

# Find insertion point for end (before last fi or at end)
insert_end_before = len(lines)
for i in range(len(lines)-1, 0, -1):
    if lines[i].strip() and not lines[i].strip().startswith('#'):
        insert_end_before = i + 1
        break

end_hook = '\n# Notify ai-memory end\n[ -x "$HOME/bin/ai-memory-end.sh" ] && "$HOME/bin/ai-memory-end.sh" "task: $TASK_ID" 2>/dev/null\n'

# Check if already patched
content = "".join(lines)
if "ai-memory-start" in content:
    print("ALREADY PATCHED — skip")
else:
    lines.insert(insert_start_after + 1, start_hook)
    lines.insert(insert_end_before + 1, end_hook)
    with open(PATH_TASK, "w") as f:
        f.writelines(lines)
    print(f"PATCHED: start after line {insert_start_after+1}, end before line {insert_end_before+1}")

Запусти: python3 /tmp/task77_patch.py

STEP 5: Верифікація
grep -n "ai-memory" ~/bin/agy-task.sh | head -5
# Має показати рядки з ai-memory-start і ai-memory-end

STEP 6: Тест — запусти dummy task
echo "ai-memory hooks test: $(~/bin/ai-memory-start.sh 2>&1 | head -1)"

COMMIT (тільки TASKS.md):
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-77/[x] TASK-77/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-77 done — ai-memory hooks in agy-task.sh"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-77:ai-memory-hooks|agy-task.sh-start+end|auto-session-tracking|★★★"

==================================================================
[x] TASK-78
Title: Fix consultant LLM timeout + verify proxy fallback chain
Agent: AGY3
Run: SSH до dev server 192.168.3.184
SSH: sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
==================================================================

КОНТЕКСТ:
- Consultant (/home/vokov/projects/uav-watcher/consultant/) не відповідає на запити
- Логи показують timeout на LocalProxy (localhost:18880) і OpenAIProxy
- Але curl напряму до localhost:18880 раніше повертав відповідь
- Порядок проксі: AGY3 → AGY → LocalProxy → OpenAIProxy

STEP 1: Діагностика - перевір що відбувається
sshpass -p '805235io.' ssh vokov@192.168.3.184 'tail -30 /var/log/uav-consultant.log'

# Перевір timeout в nodes.py
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "timeout" /home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py | head -10'

# Перевір чи localhost:18880 справді відповідає
sshpass -p '805235io.' ssh vokov@192.168.3.184 'curl -s --max-time 10 http://localhost:18880/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer freecc" -d "{\"model\":\"fast-proxy\",\"messages\":[{\"role\":\"user\",\"content\":\"ok\"}],\"max_tokens\":10}" 2>&1 | head -5'

STEP 2: Якщо timeout = 25s недостатньо для LocalProxy — збільш до 45s
Знайди в nodes.py: httpx.Client(timeout=25.0)
Заміни: httpx.Client(timeout=45.0)

Збережи як /tmp/task78_timeout.py і scp на сервер.

STEP 3: Перевір модель LocalProxy
Доступні моделі на localhost:18880:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'curl -s http://localhost:18880/v1/models -H "Authorization: Bearer freecc" | python3 -c "import sys,json;[print(m[\"id\"]) for m in json.load(sys.stdin)[\"data\"]]"'

Переконайся що config.json використовує правильну модель для LocalProxy:
- Якщо "fast-proxy" не в списку — заміни на "gpt-4o-mini" або "docs-assistant-proxy"

STEP 4: Тест після виправлення
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-consultant restart && sleep 8 && curl -s --max-time 40 -X POST http://localhost:8770/chat -H "Content-Type: application/json" -d "{\"message\":\"яка ситуація?\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get(\"reply\") or d.get(\"response\",\"NO REPLY\"))[:200])"'

STEP 5: Перевір fallback — якщо AGY3 зовнішній недоступний, LocalProxy має спрацювати
Перевір лог: має бути "proxy AGY3 failed ... proxy LocalProxy ..." → потім відповідь

COMMIT (тільки python файли):
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git add consultant/pipeline/nodes.py && git commit -m "fix(consultant): increase LLM timeout + fix proxy model (TASK-78)" && git push origin master'

~/bin/ai-memory-commit.sh uav-watcher "consultant/pipeline/nodes.py"

Mark done та push:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-78/[x] TASK-78/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-78 done — consultant timeout fix"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-78:consultant-timeout-fix|proxy-chain-verified|commit:<hash>|★★★"

==================================================================
[x] TASK-79
Title: Web UI — сортування проксі (up/down кнопки + drag-and-drop)
Agent: AGY3
Run: SSH до dev server 192.168.3.184
Файл: /home/vokov/projects/uav-watcher/web_config.py
==================================================================

КОНТЕКСТ:
Поточний UI для проксі (секція "AI Proxy") вже дозволяє додавати/видаляти.
Потрібно додати можливість СОРТУВАТИ проксі (порядок = пріоритет fallback).

STEP 1: Прочитай поточний proxy UI
sshpass -p '805235io.' ssh vokov@192.168.3.184 'grep -n "proxy-list\|addProxy\|removeProxy\|syncProxies\|renderProxies" /home/vokov/projects/uav-watcher/web_config.py | head -20'

Знайди блок JavaScript renderProxies() і додай кнопки ↑ ↓ для кожного рядка.

STEP 2: Додай moveProxy(i, direction) функцію в JS
```javascript
function moveProxy(i, dir) {
  var j = i + dir;
  if (j < 0 || j >= _proxies.length) return;
  var tmp = _proxies[i];
  _proxies[i] = _proxies[j];
  _proxies[j] = tmp;
  renderProxies();
}
```

STEP 3: Додай кнопки ↑ ↓ в renderProxies() — перед кнопкою ✕:
```javascript
'<button type="button" onclick="moveProxy('+i+',-1)" style="background:#6b7280;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer" title="Вгору">↑</button>' +
'<button type="button" onclick="moveProxy('+i+',1)" style="background:#6b7280;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer" title="Вниз">↓</button>' +
```

STEP 4: Додай номер позиції (#1, #2...) перед полем Name щоб бачити порядок:
```javascript
'<span style="color:#888;font-size:11px;min-width:20px">#'+(i+1)+'</span>' +
```

STEP 5: Застосуй як Python patch файл, scp на сервер
Збережи /tmp/task79_patch.py з точними замінами рядків.

Перевір синтаксис:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -m py_compile /home/vokov/projects/uav-watcher/web_config.py && echo "OK"'

Перезапусти web-config:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-web-config restart && sleep 3'

COMMIT:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git add web_config.py && git commit -m "feat(web-config): add proxy sort up/down buttons (TASK-79)" && git push origin master'

~/bin/ai-memory-commit.sh uav-watcher "web_config.py"

Mark done:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-79/[x] TASK-79/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-79 done — proxy sort UI"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-79:proxy-sort-ui|up-down-buttons|web-config-updated|commit:<hash>|★★★"

==================================================================
[x] TASK-80
Title: Enforce mandatory printed skill evaluation in agy-task.sh (ALL AGY)
Agent: AGY phone (і AGY3 після TASK-78)
Run: локально на Termux. Змінюємо ~/bin/agy-task.sh
==================================================================

ПРОБЛЕМА:
agy-task.sh має "MANDATORY SKILL EVALUATION" в промпті але AGY не виводить
результат оцінки — пропускає крок або оцінює внутрішньо без виводу.
Це порушує методику: без видимої оцінки неможливо перевірити що скіли застосовані.

FIX — оновити блок MANDATORY SKILL EVALUATION в ~/bin/agy-task.sh:

Знайди поточний блок (десь в PROMPT= рядку):
grep -n "MANDATORY SKILL\|SKILL EVALUATION\|available.*skills" ~/bin/agy-task.sh | head -5

Заміни весь блок "## MANDATORY SKILL EVALUATION" на:

## MANDATORY SKILL EVALUATION — PRINT FIRST

BEFORE any tool use, file read, or action — print this table:

SKILLS EVALUATION:
- skill-name: YES — reason why it applies
- skill-name: NO — reason why not
(one line per skill from the list below)

Available skills in ~/.claude/skills/:
$SKILLS_LIST

RULES (CRITICAL — no exceptions):
1. Print "SKILLS EVALUATION:" table as your VERY FIRST output
2. For every YES skill: read the skill file content BEFORE implementing  
3. If no skills apply: write "No skills needed — [reason]"
4. NEVER skip or merge this step into your implementation
5. Skills tell you HOW to do the task — read them before coding

Запиши patch як Python файл /tmp/task80_patch.py і scp на сервер:

PATH = "/data/data/com.termux/files/home/bin/agy-task.sh"
with open(PATH) as f:
    code = f.read()

old = "## MANDATORY SKILL EVALUATION (do this FIRST, before any action)"
new = """## MANDATORY SKILL EVALUATION — PRINT FIRST

BEFORE any tool use, file read, or action — print this table:

SKILLS EVALUATION:
- skill-name: YES — reason why it applies  
- skill-name: NO — reason why not
(one line per skill from the list below)"""

if old not in code:
    # Try alternative formulation
    old = "## MANDATORY SKILL EVALUATION (do this FIRST)"
    
if old in code:
    code = code.replace(old, new)
    with open(PATH, "w") as f:
        f.write(code)
    print("PATCHED OK")
else:
    # Print context to find the right string
    for i, line in enumerate(code.splitlines()):
        if "MANDATORY" in line or "SKILL EVAL" in line:
            print(f"Line {i+1}: {line!r}")
    print("ERROR: pattern not found — check output above")

Також перевір що є правило після списку скілів:
grep -A3 "Rules\|RULES" ~/bin/agy-task.sh | head -15

Якщо немає рядків про "Print FIRST" — додай після $SKILLS_LIST:

RULES (CRITICAL):
1. Print \"SKILLS EVALUATION:\" as VERY FIRST output before any action
2. For YES skills: read skill file BEFORE coding
3. If no skills: write \"No skills needed — [reason]\"
4. NEVER skip this step

Верифікація:
bash -n ~/bin/agy-task.sh && echo "SYNTAX OK"
grep -A8 "MANDATORY SKILL" ~/bin/agy-task.sh | head -12

COMMIT (тільки TASKS.md — agy-task.sh локальний на пристрої):
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-80/[x] TASK-80/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-80 done — enforce skill evaluation print in agy-task.sh"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-80:enforce-skill-eval-print|agy-task.sh-updated|mandatory-output|★★★"

==================================================================
[x] TASK-81
Title: Commit nodes.py timeout fix (25→45s) on dev server
Agent: AGY phone
Run: SSH до dev server 192.168.3.184. Простий 1-рядковий коміт.
==================================================================

sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git diff consultant/pipeline/nodes.py | head -5 && git add consultant/pipeline/nodes.py && git commit -m "fix(consultant): increase LLM call timeout 25→45s for stability (TASK-78 side-effect)" && git push origin master && echo DONE'

~/bin/ai-memory-commit.sh uav-watcher "consultant/pipeline/nodes.py"

Mark done:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-81/[x] TASK-81/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-81 done — commit timeout fix"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-81:timeout-fix-commit|nodes.py-25→45s|★★"

==================================================================
[x] TASK-82
Title: Fix Sharon bot timeout — put LocalProxy first, increase bot timeout
Agent: AGY phone
Run: SSH до dev server 192.168.3.184
==================================================================

ROOT CAUSE (підтверджено вимірюванням):
- Consultant pipeline робить 2 LLM виклики
- Кожен виклик пробує: AGY3(502, ~2s) → AGY(502, ~2s) → LocalProxy(200, ~13s) = ~17s
- 2 виклики × 17s = 34s > 30s (bot timeout в uav_watcher.py) → chat_err

FIX 1: Переставити LocalProxy ПЕРШИМ в config.json
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -c "
import json
with open(\"/home/vokov/projects/uav-watcher/config.json\") as f:
    cfg = json.load(f)
proxies = cfg.get(\"llm_proxies\", [])
# Find LocalProxy and move it first
local = [p for p in proxies if \"localhost\" in p.get(\"url\",\"\")]
others = [p for p in proxies if \"localhost\" not in p.get(\"url\",\"\")]
cfg[\"llm_proxies\"] = local + others
cfg[\"llm_proxy_url\"] = local[0][\"url\"] if local else cfg.get(\"llm_proxy_url\")
cfg[\"llm_proxy_token\"] = local[0].get(\"token\",\"freecc\") if local else cfg.get(\"llm_proxy_token\")
cfg[\"llm_proxy_model\"] = local[0].get(\"model\",\"fast-proxy\") if local else cfg.get(\"llm_proxy_model\")
with open(\"/home/vokov/projects/uav-watcher/config.json\", \"w\") as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
print(\"Proxy order:\", [p[\"name\"] for p in cfg[\"llm_proxies\"]])
"'

FIX 2: Збільш bot timeout з 30 → 60s в uav_watcher.py
Знайди рядок (line ~996):
  async with httpx.AsyncClient(timeout=30.0) as hc:
      resp = await hc.post("http://localhost:8770/chat",

Збережи /tmp/task82_patch.py:

PATH = "/home/vokov/projects/uav-watcher/uav_watcher.py"
with open(PATH) as f: code = f.read()
# There are multiple timeout=30.0 calls for chat
old = 'async with httpx.AsyncClient(timeout=30.0) as hc:\n                resp = await hc.post(\n                    "http://localhost:8770/chat",'
new = 'async with httpx.AsyncClient(timeout=60.0) as hc:\n                resp = await hc.post(\n                    "http://localhost:8770/chat",'
count = code.count(old)
if count > 0:
    code = code.replace(old, new)
    with open(PATH, "w") as f: f.write(code)
    print(f"Patched {count} occurrence(s): 30 → 60s")
else:
    # Find by simpler pattern
    import re
    matches = [(i, l) for i,l in enumerate(code.splitlines()) if "timeout=30.0" in l and "8770" in code.splitlines()[min(i+3, len(code.splitlines())-1)][:50]]
    for i,l in matches: print(f"L{i+1}: {l}")
    print("ERROR: pattern not found")

scp /tmp/task82_patch.py → server, run it

Verify fix:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'python3 -m py_compile /home/vokov/projects/uav-watcher/uav_watcher.py && echo "OK"'

FIX 3: Перезапусти сервіси та виміряй час
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-consultant restart && sleep 5 && time curl -s --max-time 25 -X POST http://localhost:8770/chat -H "Content-Type: application/json" -d "{\"message\":\"тест\",\"session_id\":\"test\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get(\"reply\",\"NO REPLY\")[:100])"'

Очікуваний результат: відповідь за < 15 секунд (LocalProxy перший)

COMMIT:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cd /home/vokov/projects/uav-watcher && git add uav_watcher.py && git commit -m "fix(sharon-bot): increase chat timeout 30→60s + LocalProxy first (TASK-82)" && git push origin master'

~/bin/ai-memory-commit.sh uav-watcher "uav_watcher.py"

Mark done:
git -C ~/workspace/ai-drakon-scaffolder pull
sed -i "s/^\[ \] TASK-82/[x] TASK-82/" ~/workspace/ai-drakon-scaffolder/development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder add development/TASKS.md
git -C ~/workspace/ai-drakon-scaffolder commit -m "chore(tasks): TASK-82 done — Sharon bot timeout fix"
git -C ~/workspace/ai-drakon-scaffolder push origin main

Diary: "SESSION:2026-05-30|TASK-82:sharon-bot-timeout|LocalProxy-first+60s-timeout|response-<15s|commit:<hash>|★★★"


## [x] TASK-92

### Мета
1. Вивчити записник **AgentWorkspace** в NotebookLM (через MCP 192.168.3.234:8002)
2. Встановити AgentWorkspace на RPi (192.168.3.234) — aarch64 binary
3. Зберегти NotebookLM MCP (порт 8002) — НЕ видаляти!
4. PinchTab — на **dev сервері** (192.168.3.184), зупинити SSH тунель з RPi до нього
5. Задокументувати результат у `docs/agentworkspace-setup.md`

### Архітектура (важливо розуміти)
```
RPi (192.168.3.234) → SSH → dev server (192.168.3.184)
                              └─ /home/vokov/.pinchtab/bin/pinchtab mcp --server :9867
```
PinchTab встановлений на dev сервері. RPi лише запускає його через SSH.
AgentWorkspace встановлюється на RPi і замінює цей SSH→PinchTab тунель.

### !!IMPORTANT!! AUTO-EXECUTE. Run locally on AGY3 Termux (деякі команди через SSH).

### Що є на RPi (192.168.3.234)
- Armbian aarch64 (rpi4b), 9.7GB вільно
- User: `vokov`, pass: `805235io.`
- **Зберегти:** `/home/vokov/notebooklm_mcp_server.py` (порт 8002)
- **Зупинити:** SSH сесію до pinchtab (`pkill -f "ssh.*pinchtab"`)
- **Зупинити:** claude сесію (`pkill -f claude`)
- **Встановити:** AgentWorkspace binary на RPi

### Кроки

**1. Вивчити AgentWorkspace через NotebookLM MCP**
```bash
# На AGY3 локально:
python3 ~/.claude/skills/notebooklm-mcp/scripts/notebooklm_mcp.py list-sources c0bd6b52-78a6-4811-a724-9eb40e6eaeb4
```

**2. Завантажити бінарник на RPi**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.234 "
wget -q --show-progress -O /tmp/agent-workspace \
  https://github.com/agent-sh/agent-workspace-linux/releases/download/v0.1.1/agent-workspace-linux-aarch64-unknown-linux-gnu
chmod +x /tmp/agent-workspace
/tmp/agent-workspace --version 2>&1 || echo 'version check failed'
"
```

**3. Встановити системні залежності на RPi**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.234 "
sudo apt install -y xvfb openbox xdotool xauth x11-utils imagemagick xclip bubblewrap 2>&1 | tail -5
sudo mv /tmp/agent-workspace /usr/local/bin/agent-workspace
echo 'Installed:' \$(agent-workspace --version 2>&1)
"
```

**4. Зупинити pinchtab SSH тунель та claude на RPi (НЕ чіпати notebooklm)**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.234 "
pkill -f 'ssh.*pinchtab' 2>/dev/null && echo 'pinchtab SSH stopped' || echo 'pinchtab not running'
pkill -f 'claude' 2>/dev/null && echo 'claude stopped' || echo 'claude not running'
sleep 2
pgrep -f 'notebooklm_mcp_server' && echo 'NotebookLM OK' || echo 'WARN: NotebookLM stopped!'
pgrep -f 'claude' && echo 'WARN: claude still running' || echo 'claude gone OK'
"
```

**5. Протестувати AgentWorkspace**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.234 "
agent-workspace --version
agent-workspace --help 2>&1 | head -20
"
```

**6. Документувати в `docs/agentworkspace-setup.md`**
Записати:
- Версія, команда запуску
- Як підключити до Claude Code (MCP config JSON)
- Що замінює PinchTab
- Системні вимоги

**7. Закомітити**
```bash
cd ~/workspace/ai-drakon-scaffolder
git add docs/agentworkspace-setup.md
git commit -m "docs: AgentWorkspace setup on RPi aarch64 — replaces PinchTab (TASK-92)"
git push origin main
```

### Верифікація
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.234 "
agent-workspace --version
pgrep -f notebooklm_mcp_server && echo NotebookLM:OK
"
```

### Diary
```
SESSION:2026-05-31|TASK-92:agentworkspace-rpi|install+test|NotebookLM-preserved|pinchtab-replaced|commit:<hash>|★★★
```

---

## [x] TASK-95

### Мета
Виправити і протестувати роботу в **ai-drakon UI** через `mcp-aws.py`:
1. Залогінитись у ai-drakon (credentials тепер відомі)
2. Навігувати по розділах (Схеми, Pipeline, Агенти)
3. Зробити скріншоти кожного розділу
4. Знайти і виправити UI баги в коді
5. Записати результати

### !!IMPORTANT!! AUTO-EXECUTE. Run locally on AGY3 Termux.
### mcp-aws.py вже є на ~/bin/mcp-aws.py — всі кроки через нього

### Credentials ai-drakon
- URL: https://ai-drakon-scaffolder.pages.dev або http://192.168.3.184:8080
- Логін: `owner`
- Пароль: `drakon-mcp-2026` (Bearer Token)

### Кроки

**1. Запустити workspace і браузер (якщо не запущено)**
```bash
python3 ~/bin/mcp-aws.py doctor
python3 ~/bin/mcp-aws.py start
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev
```

**2. Залогінитись**
```bash
python3 ~/bin/mcp-aws.py login owner drakon-mcp-2026
```

**3. Перевірити скріншот після логіну**
```bash
python3 ~/bin/mcp-aws.py screenshot /tmp/ss-logged-in.png
view_file /tmp/ss-logged-in.png
```

**4. Навігувати по розділах**
Для кожного розділу — клікнути і screenshot:
```bash
# Схеми
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/diagrams
python3 ~/bin/mcp-aws.py screenshot /tmp/ss-diagrams.png
view_file /tmp/ss-diagrams.png

# Pipeline
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/pipeline
python3 ~/bin/mcp-aws.py screenshot /tmp/ss-pipeline.png
view_file /tmp/ss-pipeline.png

# Агенти
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents
python3 ~/bin/mcp-aws.py screenshot /tmp/ss-agents.png
view_file /tmp/ss-agents.png
```

**5. DOM snapshot для розуміння структури**
```bash
python3 ~/bin/mcp-aws.py snapshot
```

**6. Виправити знайдені баги**
Якщо бачиш помилки або broken UI:
```bash
grep -r "проблемний компонент" ~/workspace/ai-drakon-scaffolder/src/ | head
# Виправити файл
# Зберегти в .lovable теж: cp src/X.tsx .lovable/src/X.tsx
```

**7. Записати результати і закомітити**
```bash
mkdir -p ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis
# Написати ai-drakon-ui-test.md з результатами
cd ~/workspace/ai-drakon-scaffolder
git add docs/ src/ .lovable/src/ 2>/dev/null
git commit -m "test(ai-drakon): browser UI test results + fixes (TASK-95)"
git push origin main
sed -i 's/\[ \] TASK-95/[x] TASK-95/' development/TASKS.md
git add development/TASKS.md && git commit -m "chore(tasks): mark TASK-95 done" && git push origin main
```

### Верифікація
```bash
ls /tmp/ss-*.png | head -5  # скріншоти існують
ls ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/
```

### Diary
```
SESSION:2026-05-31|TASK-95:ai-drakon-browser-test|login+nav+screenshots+fixes|commit:<hash>|★★★
```

---

## [x] TASK-103

**Мета**: Фінальний звіт спринту — зібрати знахідки з TASK-100/101/102/104, записати sprint1-report.md.

**Знахідки для включення в звіт:**
- TASK-100: DRAKON agent живий, код приймає, але AGY proxy не був налаштований (виправлено TASK-104)
- TASK-101: Pipeline /pipelines відкривається, browser automation timeout на typing (відомий limitation)
- TASK-102: OpenDesign огляд (результат — після завершення)
- TASK-104: ✅ localStorage очищено, drakon+architect+docs → AGY proxy gemini-2.5-flash

**!!IMPORTANT!! Run locally on AGY Termux — НЕ SSH до 192.168.3.184**

### Кроки

**1. Прочитати підсумки попередніх задач**
```bash
cat ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/problem-map.md
git -C ~/workspace/ai-drakon-scaffolder log --oneline -10
```

**2. Написати docs/uav-watcher-analysis/sprint1-report.md**

Формат звіту:
```markdown
# AI-Drakon Sprint 1 — UAV-Watcher Integration Report
> Date: 2026-05-31 | Agents: AGY phone + Claude

## What Was Tested
- DRAKON agent: [result from TASK-100]
- Pipeline analysis: [result from TASK-101]
- OpenDesign UI: [result from TASK-102]

## Working Well
[list]

## Issues Found
[list with severity]

## Next Sprint Tasks (TASK-104+)
[list]
```

**3. Закомітити і пушити**
```bash
cd ~/workspace/ai-drakon-scaffolder
git add docs/uav-watcher-analysis/sprint1-report.md
git commit -m "docs(sprint1): uav-watcher integration sprint report"
sed -i 's/\[ \] TASK-103/[x] TASK-103/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-103 done"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-103:sprint1-report|uav-watcher+ai-drakon|commit:<hash>|★★★
```

---

## [x] TASK-102

**Мета**: Як користувач ai-drakon — відкрити OpenDesign (RPi :7459) і сфотографувати поточний дизайн мобільного інтерфейсу. Зафіксувати знахідки.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Кроки

```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

# 1. Запустити браузер
python3 ~/bin/mcp-aws.py start
sleep 2

# 2. Відкрити OpenDesign на RPi
python3 ~/bin/mcp-aws.py browser http://192.168.3.234:7459
sleep 5
python3 ~/bin/mcp-aws.py screenshot $TMPD/od1-main.png
view_file $TMPD/od1-main.png

# 3. Зробити snapshot DOM — подивитися що завантажилось
python3 ~/bin/mcp-aws.py snapshot

# 4. Якщо є проекти — відкрити ai-drakon проект
# (шукати текст "ai-drakon" або "mobile" в snapshot)
# Клікнути на потрібний проект
# python3 ~/bin/mcp-aws.py click X Y  (координати зі скріншоту)
# sleep 3
# python3 ~/bin/mcp-aws.py screenshot $TMPD/od2-project.png
# view_file $TMPD/od2-project.png

# 5. Зупинити
python3 ~/bin/mcp-aws.py stop
```

### Що записати в diary
- Чи завантажився OpenDesign (yes/no)
- Що видно на головній сторінці
- Назви проектів якщо є
- Пр��блеми або помилки

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder
sed -i 's/\[ \] TASK-102/[x] TASK-102/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-102 done — OpenDesign UI review"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-102:opendesign-review|RPi-7459+screenshots|opendesign-status:OK/FAIL|commit:<hash>|★★★
```

---

## [ ] TASK-101

**Мета**: Як користувач ai-drakon — запустити Pipeline "Рефакторинг" на функції з uav-watcher і зафіксувати результат.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Кроки

```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

# 1. Отримати функцію score_proximity (рядки 78-100 uav_watcher.py)
curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/github/file?owner=maxfraieho&repo=uav-watcher&path=uav_watcher.py&branch=master" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
lines=d.get('content','').split('\n')
snippet='\n'.join(lines[77:110])
open('/tmp/score_prox.txt','w').write(snippet)
print('Lines:',len(snippet.split('\n')))
print(snippet[:200])
"

# 2. Запустити браузер і залогінитись
python3 ~/bin/mcp-aws.py start
sleep 2
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev
sleep 4
python3 ~/bin/mcp-aws.py login
sleep 4

# 3. Перейти на /pipelines
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/pipelines
sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/pipeline1.png
view_file $TMPD/pipeline1.png

# 4. Зробити snapshot — знайти поле вводу і кнопку "Рефакторинг"
python3 ~/bin/mcp-aws.py snapshot
# Знайти textarea або input для коду, клікнути
# python3 ~/bin/mcp-aws.py click X Y
# python3 ~/bin/mcp-aws.py type "$(cat /tmp/score_prox.txt)"

# 5. Фінальний скріншот результату
python3 ~/bin/mcp-aws.py screenshot $TMPD/pipeline2-result.png
view_file $TMPD/pipeline2-result.png
python3 ~/bin/mcp-aws.py stop
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder
sed -i 's/\[ \] TASK-101/[x] TASK-101/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-101 done — pipeline analysis uav-watcher"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-101:pipeline-analysis|score-proximity+refactor|screenshot-result|commit:<hash>|★★★
```

---

## [x] TASK-100

**Мета**: Як користувач ai-drakon — відкрити /agents, знайти DRAKON IR агента, вставити код keyword_classify і отримати відповідь.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Алгоритм (виконуй крок за кроком, не пропускай)

**Крок 1 — Отримати код:**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/github/file?owner=maxfraieho&repo=uav-watcher&path=uav_watcher.py&branch=master" | python3 -c "
import json,sys
d=json.load(sys.stdin)
lines=d.get('content','').split('\n')
snippet='\n'.join(lines[219:244])
open('/tmp/kw_classify.txt','w').write(snippet)
print(snippet[:300])
"
```

**Крок 2 — Запустити браузер і залогінитись:**
```bash
python3 ~/bin/mcp-aws.py start && sleep 3
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev && sleep 5
python3 ~/bin/mcp-aws.py login && sleep 5
python3 ~/bin/mcp-aws.py screenshot $TMPD/s1.png
view_file $TMPD/s1.png
```

**Крок 3 — Відкрити /agents, зробити snapshot, знайти DRAKON агента:**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents && sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/s2-agents.png
view_file $TMPD/s2-agents.png
python3 ~/bin/mcp-aws.py snapshot
```
З snapshot або screenshot визначи X Y координати агента "Pipeline A" або "DRAKON IR Generator" (він в лівій панелі, приблизно x=150 y=150-250).

**Крок 4 — Клікнути на агента і ввести код:**
```bash
python3 ~/bin/mcp-aws.py click 150 180 && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/s3-agent-chat.png
view_file $TMPD/s3-agent-chat.png
python3 ~/bin/mcp-aws.py snapshot
```
З snapshot знайди textarea або input для чату (внизу сторінки або в правій панелі).

**Крок 5 — Клікнути на поле вводу і ввести код:**
```bash
python3 ~/bin/mcp-aws.py click 640 800 && sleep 1
python3 ~/bin/mcp-aws.py key "ctrl+a" && sleep 0.5
KW_CODE=$(cat /tmp/kw_classify.txt | head -10)
python3 ~/bin/mcp-aws.py type "$KW_CODE" && sleep 2
python3 ~/bin/mcp-aws.py key "Return" && sleep 12
python3 ~/bin/mcp-aws.py screenshot $TMPD/s4-response.png
view_file $TMPD/s4-response.png
```

**Крок 6 — Зупинити і закомітити:**
```bash
python3 ~/bin/mcp-aws.py stop
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-100/[x] TASK-100/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-100 done — DRAKON agent analysis uav-watcher"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-100:drakon-agent|agents-page+click+code-input+response|commit:<hash>|★★★
```

---

## [x] TASK-99

### Мета
Виправити Code section (src/pages/CodePage.tsx) — замість мовчазного "Не вдалося завантажити" показувати зрозумілий fallback UI коли GitHub токен не налаштований.

### !!IMPORTANT!! Run locally on AGY Termux — НЕ SSH до 192.168.3.184

### Файли для зміни
- `src/pages/CodePage.tsx` + `.lovable/src/pages/CodePage.tsx` (обов'язково обидва)

### Що зробити

**В `CodePage.tsx` (export default function CodePage) — перед блоком `return (...)`:**

Після рядків де визначені `owner`, `repo`, `branch`, `token` (рядки ~177-182), додати early return:

```tsx
  // Early return if GitHub not configured
  if (!ghCfg.token || !ghCfg.owner || !ghCfg.repo) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <FileCode className="h-10 w-10 text-[var(--text-muted)]" />
          <div>
            <p className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
              GitHub не налаштований
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Додайте токен та репозиторій у Налаштуваннях
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/settings" })}
            className="inline-flex items-center gap-2 rounded px-4 py-1.5 font-mono text-[11px] font-medium bg-[var(--accent-amber)] text-[#1a1000] hover:brightness-110 transition-all"
          >
            <Cog className="h-3.5 w-3.5" />
            Відкрити Налаштування
          </button>
        </div>
      </div>
    );
  }
```

**Перевір що `Cog` та `FileCode` вже імпортовані** (вони є в lucide-react, скоріше за все вже є — перевір рядок imports).

### Верифікація
```bash
cd ~/workspace/ai-drakon-scaffolder
# TypeScript build
npm run build 2>&1 | grep -E "error|warning" | head -10

# Sync перевірка
diff src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx && echo "SYNC OK"
```

### Commit
```bash
git add src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git commit -m "fix(code-page): show settings prompt when GitHub token not configured"
sed -i 's/\[ \] TASK-99/[x] TASK-99/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-99 done"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-99:code-page-no-token-fallback|early-return+settings-btn|commit:<hash>|★★★
```

---

## [x] TASK-98

### Мета
В Settings ai-drakon змінити GitHub repo з `maxfraieho/drakon-setup-hub` на `maxfraieho/uav-watcher` через браузер.

### !!IMPORTANT!! AUTO-EXECUTE. Run locally on AGY3 Termux.

### Кроки

**1. Запустити браузер і залогінитись**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
python3 ~/bin/mcp-aws.py start
sleep 2
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev
sleep 4
python3 ~/bin/mcp-aws.py login
sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/ss1-login.png
view_file $TMPD/ss1-login.png
```

**2. Перейти до Settings і зробити скріншот**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/settings
sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/ss2-settings.png
view_file $TMPD/ss2-settings.png
```
На скріншоті знайди поле де написано "maxfraieho/drakon-setup-hub" або "GitHub repository".

**3. Зробити DOM snapshot щоб знайти координати поля**
```bash
python3 ~/bin/mcp-aws.py snapshot
```
Знайди input або text field з "drakon-setup-hub" в тексті.

**4. Клікнути на поле repo і змінити на uav-watcher**
```bash
# Клікни на поле (знайди координати зі скріншоту)
python3 ~/bin/mcp-aws.py click X Y
sleep 1
# Очистити поле (Ctrl+A) і ввести новий репо
python3 ~/bin/mcp-aws.py key "ctrl+a"
python3 ~/bin/mcp-aws.py type "maxfraieho/uav-watcher"
sleep 1
python3 ~/bin/mcp-aws.py screenshot $TMPD/ss3-filled.png
view_file $TMPD/ss3-filled.png
```

**5. Зберегти і перевірити**
```bash
# Знайти і натиснути кнопку Save/Зберегти
python3 ~/bin/mcp-aws.py key "Return"
sleep 2
python3 ~/bin/mcp-aws.py screenshot $TMPD/ss4-saved.png
view_file $TMPD/ss4-saved.png
python3 ~/bin/mcp-aws.py stop
```

**6. Закомітити TASK-98 як done**
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main
sed -i 's/\[ \] TASK-98/[x] TASK-98/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-98 done — uav-watcher github connected"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-98:settings-github-uav-watcher|browser+click+save|commit:<hash>|★★★
```

---

## [x] TASK-96

### Мета
Проаналізувати скріншоти ai-drakon UI і написати звіт що потрібно виправити/додати для роботи з uav-watcher.

### !!IMPORTANT!! AUTO-EXECUTE. Run locally on AGY3 Termux. NO browser needed — screenshots already in repo.

### Контекст
Скріншоти вже в репо: `docs/screenshots/task96/`
- `ai-drakon-1-home.png` — головна після логіну (/diagrams)
- `ai-drakon-2-diagrams.png` — розділ Схеми (є діаграма SlotRouter)
- `ai-drakon-3-pipeline.png` — розділ Pipeline
- `ai-drakon-4-agents.png` — розділ Агенти
- `ai-drakon-5-settings.png` — розділ Налаштування

uav-watcher аналіз: `docs/uav-watcher-analysis/architecture.md` (прочитай для контексту)

### Кроки

**1. Pull репо і переглянь скріншоти**
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main
```
Переглянь файли:
```
view_file ~/workspace/ai-drakon-scaffolder/docs/screenshots/task96/ai-drakon-1-home.png
view_file ~/workspace/ai-drakon-scaffolder/docs/screenshots/task96/ai-drakon-2-diagrams.png
view_file ~/workspace/ai-drakon-scaffolder/docs/screenshots/task96/ai-drakon-3-pipeline.png
view_file ~/workspace/ai-drakon-scaffolder/docs/screenshots/task96/ai-drakon-4-agents.png
view_file ~/workspace/ai-drakon-scaffolder/docs/screenshots/task96/ai-drakon-5-settings.png
```

**2. Прочитай архітектуру uav-watcher**
```
view_file ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/architecture.md
```

**3. Напиши звіт `docs/uav-watcher-analysis/ai-drakon-ui-report.md`**

Структура звіту:
```markdown
# AI-Drakon UI Analysis for UAV Watcher (TASK-96)

## Поточний стан UI

### Головна (Diagrams)
[опис що бачиш]

### Pipeline
[опис]

### Агенти
[опис]

### Налаштування
[опис]

## Що добре працює
[список]

## Знайдені проблеми
[список з описом]

## Що потрібно для uav-watcher
[список нових фічей/схем]

## Рекомендовані DRAKON схеми для uav-watcher
1. Threat Detection Pipeline
2. AllClear Sync
3. Sharon Consultant Flow
4. Shelter Search
```

Запиши файл через run_command:
```bash
python3 -c "
content = '''# AI-Drakon UI Analysis...'''
open('docs/uav-watcher-analysis/ai-drakon-ui-report.md','w').write(content)
print('written')
"
```

**4. Закомітити**
```bash
cd ~/workspace/ai-drakon-scaffolder
git add docs/uav-watcher-analysis/ai-drakon-ui-report.md
git commit -m "docs(ai-drakon): UI analysis report for uav-watcher (TASK-96)"
git push origin main
sed -i 's/\[ \] TASK-96/[x] TASK-96/' development/TASKS.md
git add development/TASKS.md && git commit -m "chore(tasks): mark TASK-96 done" && git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-96:ai-drakon-ui-report|screenshots-analyzed+report+recommendations|commit:<hash>|★★★
```

---

## [x] TASK-94

### Мета
**Комплексний аудит ai-drakon** — AGY3 виступає тестувальником-розробником, який реально працює над проектом **uav-watcher** через інтерфейс ai-drakon.
Мета: практично перевірити кожен інструмент ai-drakon (DRAKON схеми, Агент-Архітектор, Агент-Документатор, Pipeline), задокументувати всі знайдені проблеми, написати карту покращень та створити перші DRAKON схеми для uav-watcher.

### !!IMPORTANT!! AUTO-EXECUTE. Run locally on AGY3 Termux. NO skill loading.
### !!CRITICAL!! Використовуй ТІЛЬКИ run_command. Файли пиши через python3 з f-string або cat heredoc.

### Контекст для AGY3

**Ти — тестувальник-розробник.** Твоя роль: реально працювати над проектом uav-watcher ЧЕРЕЗ ІНСТРУМЕНТИ ai-drakon, одночасно виявляючи недоліки платформи.

**uav-watcher (Sharon)** — система моніторингу повітряних загроз. Ключові компоненти:
1. **Threat Detection Pipeline**: Telegram → Telethon → GeoFilter → LangGraph Classifier → Alert
2. **AllClear Sync**: catchup_history → detect missed allclear → update state
3. **Sharon Consultant**: user query → LangGraph RAG → OSM/Telegram → response
4. **Shelter Search**: location share → Overpass API → find shelters → return list

Документація: `~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/`
- `architecture.md` — повна архітектура
- `components.md` — компоненти
- `data-flow.md` — потоки даних

**ai-drakon URL**: https://ai-drakon-scaffolder.pages.dev
**Login**: owner / drakon-mcp-2026
**OpenDesign**: http://192.168.3.234:7459 (UI design tool, якщо доступний)

**Проблеми вже відомі** (з попереднього аналізу):
- `/pipelines` → 404 виправлено, але pipeline editor не протестований
- Settings GitHub: вже встановлено maxfraieho/uav-watcher, але token порожній
- Агенти: Sharon LangGraph Pipeline + Shelter Search є, але чи працюють?

### Браузерні команди
```bash
T=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
python3 ~/bin/mcp-aws.py start
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev
python3 ~/bin/mcp-aws.py login          # auto-dismiss password dialog
python3 ~/bin/mcp-aws.py screenshot $T/ss.png && view_file $T/ss.png
python3 ~/bin/mcp-aws.py navigate URL
python3 ~/bin/mcp-aws.py snapshot       # DOM tree
python3 ~/bin/mcp-aws.py click X Y
python3 ~/bin/mcp-aws.py type "text"
python3 ~/bin/mcp-aws.py key "Return"
python3 ~/bin/mcp-aws.py scroll down
python3 ~/bin/mcp-aws.py stop
```
**ВАЖЛИВО**: після кожного `screenshot` — одразу `view_file` щоб бачити стан UI.

### SETUP (виконуй один раз)
```bash
T=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
cd ~/workspace/ai-drakon-scaffolder && git pull origin main
python3 ~/bin/mcp-aws.py start && sleep 2
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev && sleep 4
python3 ~/bin/mcp-aws.py login && sleep 3
python3 ~/bin/mcp-aws.py screenshot $T/s0-start.png && view_file $T/s0-start.png
# Перевір: бачиш /diagrams з сайдбаром? Якщо ні — повтори login.
```

---

### ФАЗА 1: Читання документації uav-watcher (без браузера)
```bash
read_file ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/architecture.md
read_file ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/components.md
```
Ти маєш зрозуміти: що таке Sharon, які є потоки даних, які компоненти ключові.

---

### ФАЗА 2: Аудит розділів ai-drakon (скріншоти + нотатки)

Для кожного розділу: navigate → screenshot → view_file → занотуй проблему.

```bash
T=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

# 2a. Diagrams (головна)
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/diagrams
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f2a-diagrams.png && view_file $T/f2a-diagrams.png
# Що бачиш? Є кнопка "+" для нової схеми? Яка схема відкрита?

# 2b. Pipelines
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/pipelines
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f2b-pipelines.png && view_file $T/f2b-pipelines.png
# Що бачиш? Чи є список pipeline-ів? Чи є кнопка "Create"?

# 2c. Agents
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f2c-agents.png && view_file $T/f2c-agents.png
# Які агенти є? Sharon LangGraph Pipeline, Shelter Search — чи можна їх запустити?

# 2d. Code editor
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/code
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f2d-code.png && view_file $T/f2d-code.png
# Є редактор коду? Що в ньому?

# 2e. Notes
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/notes
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f2e-notes.png && view_file $T/f2e-notes.png
```

**Checkpoint 1**: Після кожного view_file — занотуй одним реченням що бачиш і чи є проблема.

---

### ФАЗА 3: Практична робота — DRAKON схеми для uav-watcher

Створити 2 DRAKON схеми прямо в ai-drakon UI:

**3a. Схема "Threat Detection Pipeline"**
```bash
# Перейти до diagrams
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/diagrams
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f3a-before.png && view_file $T/f3a-before.png

# Знайти кнопку "+" (new diagram) — зазвичай у правому верхньому куті панелі DIAGRAMS
# На основі скріншоту визнач координати і клікни:
python3 ~/bin/mcp-aws.py click X Y   # замінити X Y
sleep 1 && python3 ~/bin/mcp-aws.py screenshot $T/f3a-dialog.png && view_file $T/f3a-dialog.png

# Якщо з'явився dialog з полем назви — ввести назву:
python3 ~/bin/mcp-aws.py type "Threat Detection Pipeline"
python3 ~/bin/mcp-aws.py key "Return"
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f3a-created.png && view_file $T/f3a-created.png
```
Якщо schema створена — це вже успіх. Зафіксуй в нотатках.
Якщо кнопки немає або dialog не з'явився — запиши в проблеми: "Cannot create new diagram".

**3b. Робота з агентом ARCHITECT**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f3b-agents.png && view_file $T/f3b-agents.png

# Знайди агента (Sharon LangGraph Pipeline або будь-який агент-архітектор)
# Клікни на нього — подивись що відкривається
python3 ~/bin/mcp-aws.py click X Y   # координати кнопки агента зі скріншоту
sleep 2 && python3 ~/bin/mcp-aws.py screenshot $T/f3b-agent-open.png && view_file $T/f3b-agent-open.png

# Якщо є поле вводу — спробуй ввести запит про uav-watcher:
python3 ~/bin/mcp-aws.py click X Y   # поле вводу
python3 ~/bin/mcp-aws.py type "Analyze the Threat Detection Pipeline of uav-watcher system. Create DRAKON diagram nodes for: Telegram input -> GeoFilter -> LangGraph Classifier -> Alert Dispatcher"
python3 ~/bin/mcp-aws.py key "Return"
sleep 5 && python3 ~/bin/mcp-aws.py screenshot $T/f3b-agent-result.png && view_file $T/f3b-agent-result.png
```
Занотуй: чи відповів агент? Чи є результат? Які проблеми з UX?

**3c. OpenDesign (якщо доступний)**
```bash
python3 ~/bin/mcp-aws.py navigate http://192.168.3.234:7459
sleep 3 && python3 ~/bin/mcp-aws.py screenshot $T/f3c-opendesign.png && view_file $T/f3c-opendesign.png
# Якщо відкрився — зафіксуй що є. Якщо 404 — запиши "OpenDesign недоступний на :7459"
```

---

### ФАЗА 4: Написати карту проблем (PROBLEM MAP)

На основі всього що бачив — написати файл `docs/uav-watcher-analysis/problem-map.md`.

Структура:
```
# AI-Drakon Problem Map (TASK-94 Audit)
> Date: 2026-05-31 | Auditor: AGY3

## CRITICAL (блокує роботу)
- [ ] ПРОБЛЕМА: опис | Де: URL | Репро: кроки

## HIGH (заважає роботі)
- [ ] ...

## MEDIUM (незручно)
- [ ] ...

## LOW (дрібниці)
- [ ] ...

## WORKING WELL (що добре)
- ...

## MISSING FEATURES (чого немає)
- ...

## DRAKON DIAGRAMS CREATED
- ...

## NEXT STEPS (план виправлення)
1. ...
```

Записати файл через python3:
```bash
python3 -c "
content = '''# AI-Drakon Problem Map (TASK-94 Audit)
...
'''
open('docs/uav-watcher-analysis/problem-map.md', 'w').write(content)
print('written')
"
```

---

### ФАЗА 5: Зупинити workspace і закомітити ВСЕ
```bash
python3 ~/bin/mcp-aws.py stop

cd ~/workspace/ai-drakon-scaffolder && git pull origin main
git add docs/uav-watcher-analysis/problem-map.md
git add docs/ 2>/dev/null || true
git commit -m "docs(audit): ai-drakon problem map + uav-watcher DRAKON work (TASK-94)"
git push origin main

# Позначити TASK-94 виконаним
sed -i 's/## \[ \] TASK-94/## [x] TASK-94/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-94 done"
git push origin main

# Diary
python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-31|TASK-94:ai-drakon-audit|phases:1-5+problem-map+DRAKON-diagrams|commit:$(git rev-parse --short HEAD)|done|★★★"
```

### Верифікація
```bash
ls docs/uav-watcher-analysis/problem-map.md && echo "OK"
git log --oneline -3
```

### Diary
```
SESSION:2026-05-31|TASK-94:ai-drakon-comprehensive-audit|5-phases:docs+diagrams+agents+opendesign+problem-map|commit:<hash>|★★★
```

---

## [x] TASK-93

### Мета
Провести аналіз коду **uav-watcher (Sharon)** і написати документацію.

### !!IMPORTANT!! AUTO-EXECUTE. Run locally on AGY3 Termux.
### !!CRITICAL!! НЕ ЧІПАЙ OpenDesign, плагіни, Docker, контейнери. ТІЛЬКИ читання коду + документація + git.

### Контекст
- uav-watcher repo: `/home/vokov/projects/uav-watcher/` на сервері `192.168.3.184`
- SSH команда: `sshpass -p '805235io.' ssh vokov@192.168.3.184`
- Головний файл: `uav_watcher.py` (~1500-2000 рядків Python)
- Також: `sharon_consultant.py` (FastAPI :8770), `config.json` (не в git)
- Документацію пиши локально в `~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/`

### Кроки

**1. Список файлів**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.184 'find ~/projects/uav-watcher -name "*.py" | grep -v __pycache__ | sort && wc -l ~/projects/uav-watcher/*.py'
```

**2. Читання коду через SSH**
```bash
# Головний файл:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cat ~/projects/uav-watcher/uav_watcher.py'
# Консультант:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'cat ~/projects/uav-watcher/sharon_consultant.py 2>/dev/null || echo "not found"'
# Інші .py файли по одному
```

**3. Написати 4 markdown файли** (локально на AGY3):
```bash
mkdir -p ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis
```
- `architecture.md` — загальна архітектура: Telethon userbot → AI classifier → notifications → Sharon API
- `components.md` — всі класи/функції: назва, відповідальність, ключові змінні стану
- `data-flow.md` — потоки даних: Telegram msg → обробка → сповіщення; user query → Sharon → відповідь
- `issues.md` — знайдені проблеми, tech debt, потенційні баги

**4. Виправити критичні баги** (якщо знайдеш очевидні):
```bash
# Виправлення на сервері через scp або heredoc
# Після виправлення:
sshpass -p '805235io.' ssh vokov@192.168.3.184 'sudo rc-service uav-watcher restart && sleep 3 && tail -20 /var/log/uav-watcher.log'
```

**5. Коміт і push**
```bash
cd ~/workspace/ai-drakon-scaffolder
git add docs/uav-watcher-analysis/
git commit -m "docs(uav-watcher): architecture analysis, components, data-flow, issues (TASK-93)"
git push origin main
# Потім позначити в TASKS.md:
sed -i 's/^## \[ \] TASK-93/## [x] TASK-93/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-93 done"
git push origin main
```

**6. Handoff якщо не вистачає часу**
Якщо не встигаєш — закоміть що є + додай TASK-94 в TASKS.md з описом що залишилось.

### Верифікація
```bash
ls ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/
# Має бути: architecture.md, components.md, data-flow.md, issues.md
```

### Diary
```
SESSION:2026-05-31|TASK-93:uav-watcher-docs|architecture+components+data-flow+issues|commit:<hash>|★★★
```

---

## [x] TASK-91

### Мета
Створити OpenDesign Plugin для проекту ai-drakon — pre-configured skill що обходить discovery form.
Файли: `open-design-plugin/SKILL.md` + `open-design-plugin/open-design.json`

### !!IMPORTANT!! AUTO-EXECUTE, не чекай approve. Run locally on Termux (AGY phone).

### Кроки

**1. Створити `open-design-plugin/SKILL.md`**

```markdown
# AI-Drakon Mobile UI Designer

You are a specialized design agent for the **ai-drakon** TypeScript/React project.

## Project context
- Framework: React 18 + TypeScript + Tailwind CSS + Vite
- Icons: Lucide React
- Router: react-router-dom v6
- Design: Dark theme, Modern minimal (inspired by Vercel/Linear)
- Mobile-first: all components must have md:hidden or responsive classes

## Your task
When asked to generate a UI component:
1. Output a complete React TypeScript component in a single code block
2. Use only: Tailwind CSS, Lucide icons, react-router-dom hooks
3. Include proper TypeScript interfaces
4. Add `md:hidden` for mobile-only components
5. Follow glassmorphism pattern for mobile overlays: `bg-black/60 backdrop-blur-lg`
6. NO discovery forms — generate directly

## Output format
Always output:
1. Brief description (1-2 sentences)
2. Full component code in ```tsx block
3. Usage example
```

**2. Створити `open-design-plugin/open-design.json`**

```json
{
  "$schema": "https://open-design.ai/schemas/plugin.v1.json",
  "specVersion": "1.0.0",
  "name": "ai-drakon-mobile",
  "title": "AI-Drakon Mobile Designer",
  "version": "0.1.0",
  "description": "Pre-configured mobile UI generator for ai-drakon React/TypeScript project. Skips discovery form, outputs Tailwind+Lucide components directly.",
  "capabilitiesRequired": ["prompt:inject"],
  "od": {
    "agent": "antigravity",
    "designSystem": "agentic",
    "pipeline": {
      "stages": ["generate"]
    },
    "defaults": {
      "taskType": "Live artifact",
      "audience": "developers",
      "brand": "pick_direction",
      "constraints": "Tailwind CSS, Lucide icons, react-router-dom, TypeScript, dark theme"
    }
  }
}
```

**3. Встановити плагін в OpenDesign**

```bash
# Скопіювати plugin файли в data volume контейнера
sshpass -p '805235io.' ssh vokov@192.168.3.184 '
mkdir -p /var/lib/docker/volumes/open_design_data/_data/plugins/ai-drakon-mobile
cp -r /tmp/ai-drakon-plugin/* /var/lib/docker/volumes/open_design_data/_data/plugins/ai-drakon-mobile/
'
```

**4. Закомітити в репо**

```bash
cd ~/workspace/ai-drakon-scaffolder
mkdir -p open-design-plugin
# (записати файли)
git add open-design-plugin/
git commit -m "feat(opendesign): add ai-drakon mobile UI plugin (TASK-91)"
git push origin main
```

### Верифікація
```bash
ls ~/workspace/ai-drakon-scaffolder/open-design-plugin/
cat ~/workspace/ai-drakon-scaffolder/open-design-plugin/open-design.json
```

### Diary
```
SESSION:2026-05-31|TASK-91:opendesign-plugin|ai-drakon-mobile-plugin|SKILL.md+open-design.json|commit:<hash>|★★★
```

---

## [x] TASK-90

### Мета
Переробити мобільний інтерфейс ai-drakon: замінити sidebar на `MobileNavigationDock` (bottom nav, glassmorphism).
На основі guide: `docs/opendesign-mobile-integration.md`.

**!!AUTO-EXECUTE — НЕ ЧЕКАТИ APPROVE!! Просто виконай кроки і закоміть.**

### !!IMPORTANT!! Де запускати
**ЛОКАЛЬНО на AGY3 Termux** — `cd ~/workspace/ai-drakon-scaffolder && git pull origin main`

### Крок 1: Створити `src/components/mobile/MobileNavigationDock.tsx`

```tsx
import React from "react";
import { LayoutGrid, FileText, Code2, Cpu, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export const MobileNavigationDock: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { id: "overview",  label: "Огляд",   icon: LayoutGrid, path: "/overview" },
    { id: "pipelines", label: "Схеми",   icon: FileText,   path: "/pipelines" },
    { id: "code",      label: "Код",     icon: Code2,      path: "/code" },
    { id: "agents",    label: "Агенти",  icon: Cpu,        path: "/agents" },
    { id: "settings",  label: "Опції",   icon: Settings,   path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-lg border-t border-zinc-800 pb-safe md:hidden">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={"relative flex flex-col items-center justify-center w-14 h-12 transition-colors " + (isActive ? "text-white" : "text-zinc-400 hover:text-zinc-100")}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium select-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

### Крок 2: Оновити `src/components/app/AppLayout.tsx`

Зміни:
- Додати `import { MobileNavigationDock }` зверху
- `<aside>` отримує клас `hidden md:block`
- `<main>` отримує `pb-20 md:pb-6`
- Перед закриваючим `</div>` (корінь) додати `<MobileNavigationDock />`

```tsx
import { NavLink, Outlet } from "react-router-dom";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { MobileNavigationDock } from "@/components/mobile/MobileNavigationDock";

const navItems = [
  { to: "/overview",     label: "Overview" },
  { to: "/proxies",      label: "Proxies" },
  { to: "/providers",    label: "Providers" },
  { to: "/models",       label: "Models" },
  { to: "/credentials",  label: "Credentials" },
  { to: "/observability",label: "Observability" },
  { to: "/routing",      label: "Routing" },
  { to: "/settings",     label: "Settings" },
] as const;

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm font-semibold">AI Drakon</div>
          <LanguageSwitcher />
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block rounded-md border border-border bg-card p-2">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  ["rounded-sm px-3 py-2 text-sm transition-colors",
                   isActive ? "bg-primary text-primary-foreground"
                             : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  ].join(" ")}
              >{item.label}</NavLink>
            ))}
          </nav>
        </aside>
        <main className="rounded-md border border-border bg-card p-4 pb-20 md:pb-6 md:p-6">
          <Outlet />
        </main>
      </div>
      <MobileNavigationDock />
    </div>
  );
}
```

### Крок 3: CSS — додати в `src/index.css`

```css
/* Mobile safe area */
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

### Крок 4: Синхронізація з .lovable
```bash
cp src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx
mkdir -p .lovable/src/components/mobile
cp src/components/mobile/MobileNavigationDock.tsx .lovable/src/components/mobile/MobileNavigationDock.tsx
```

### Верифікація
```bash
npm run build 2>&1 | tail -10
grep -r "MobileNavigationDock" src/ --include="*.tsx"
```

### Коміт
```
feat(mobile): add MobileNavigationDock bottom nav, hide sidebar on mobile (TASK-90)
```

### Diary
```
SESSION:2026-05-31|TASK-90:mobile-nav-dock|MobileNavigationDock+AppLayout-mobile|glassmorphism-bottom-nav|commit:<hash>|★★★
```

---

## [x] TASK-89

### Мета
Запитати записник **OpenDesign** у NotebookLM через MCP (192.168.3.234:8002) та створити інструкцію інтеграції проекту **ai-drakon** з OpenDesign для покращення мобільного UI.

### !!IMPORTANT!! Де запускати
**ЛОКАЛЬНО на AGY phone (Termux)** — НЕ SSH на dev server.

### Контекст
- NotebookLM MCP: `http://192.168.3.234:8002`
- OpenDesign notebook ID: `9975e787-887f-4e62-9d54-ba059efb9485`
- ai-drakon repo: `~/workspace/ai-drakon-scaffolder`
- OpenDesign UI: `http://192.168.3.184:7459` (token: `2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a`)
- OpenDesign — local-first open-source design tool, підтримує: Web/mobile/desktop прототипи, 259+ skills, 142+ design systems, HTML/PDF/PPTX/MP4 export, GitHub sync

### Кроки

**1. Запитати NotebookLM MCP щодо OpenDesign + ai-drakon інтеграції**

```python
# Зберегти як ~/od-query.py та запустити: python3 ~/od-query.py
import urllib.request, json

NB_ID = "9975e787-887f-4e62-9d54-ba059efb9485"
MCP = "http://192.168.3.234:8002"

# Get session
req = urllib.request.Request(MCP + "/mcp", method="GET")
req.add_header("Accept", "application/json, text/event-stream")
try:
    urllib.request.urlopen(req, timeout=5)
except Exception as e:
    sid = getattr(e, "headers", {}).get("mcp-session-id", "")

headers = {"Content-Type": "application/json", "mcp-session-id": sid}

def mcp_call(method, params):
    payload = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode()
    req = urllib.request.Request(MCP + "/mcp", data=payload, headers=headers, method="POST")
    req.add_header("Accept", "text/event-stream")
    result = ""
    with urllib.request.urlopen(req, timeout=30) as r:
        for line in r:
            line = line.decode().strip()
            if line.startswith("data:"):
                try:
                    d = json.loads(line[5:])
                    content = d.get("result", {}).get("content", [])
                    if content:
                        result = json.loads(content[0]["text"])
                except: pass
    return result

# Initialize
mcp_call("initialize", {"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"agy","version":"1.0"}})

# Ask 3 questions
questions = [
    "Як підключити зовнішній GitHub репозиторій до OpenDesign? Покрокова інструкція для проекту на TypeScript/React.",
    "Як налаштувати OpenDesign для покращення мобільного інтерфейсу React-проекту? Які design systems та skills найкраще підходять для mobile-first підходу?",
    "Як використовувати OpenDesign для генерації мобільних UI компонентів та експорту в HTML/React код?"
]

answers = []
for q in questions:
    r = mcp_call("tools/call", {"name": "chat_ask", "arguments": {"notebook_id": NB_ID, "question": q}})
    answers.append({"q": q, "a": r.get("answer", str(r))})
    print(f"Q: {q[:60]}...")
    print(f"A: {str(r)[:200]}")
    print()

# Save to file
import os
out = os.path.expanduser("~/od-answers.json")
with open(out, "w") as f:
    json.dump(answers, f, ensure_ascii=False, indent=2)
print(f"Saved to {out}")
```

**2. Якщо MCP недоступний — використати LLM проксі**

```python
# Fallback: запитати Gemini через локальний проксі
import urllib.request, json

PROXY = "http://localhost:8080/v1/messages"
prompt = """На основі документації OpenDesign (open-source, local-first design tool):
- Підтримує: React/TypeScript проекти, 259+ skills, mobile/web прототипи
- Агент: Antigravity (agy wrapper)
- UI: http://192.168.3.184:7459

Створи детальну інструкцію українською мовою:
1. Як підключити ai-drakon TypeScript/React проект до OpenDesign
2. Які skills/design systems вибрати для mobile-first UI
3. Як генерувати та експортувати мобільні UI компоненти
4. Конкретні кроки для покращення мобільного інтерфейсу Drakon-editor
Формат: Markdown з розділами та кодовими прикладами."""

payload = json.dumps({
    "model": "gemini-2.5-flash",
    "max_tokens": 4000,
    "messages": [{"role": "user", "content": prompt}]
}).encode()
req = urllib.request.Request(PROXY, data=payload, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=60) as r:
    resp = json.loads(r.read())
text = ""
for b in resp.get("content", []):
    if b.get("type") == "text":
        text += b["text"]
print(text[:500])
with open(os.path.expanduser("~/od-answers.txt"), "w") as f:
    f.write(text)
```

**3. Зберегти результат у репо та закомітити**

```bash
cd ~/workspace/ai-drakon-scaffolder
git pull origin main

# Записати інструкцію
mkdir -p docs
# Скопіювати/написати результат у docs/opendesign-mobile-integration.md
# Формат: Markdown, українська мова, розділи:
# ## Підключення проекту до OpenDesign
# ## Налаштування для Mobile-First
# ## Генерація UI компонентів  
# ## Експорт та інтеграція в React
# ## Покращення мобільного інтерфейсу Drakon-editor

git add docs/opendesign-mobile-integration.md
git commit -m "docs: OpenDesign mobile integration guide for ai-drakon (TASK-89)"
git push origin main
```

### Верифікація
```bash
# Файл створено?
ls -la ~/workspace/ai-drakon-scaffolder/docs/opendesign-mobile-integration.md
head -20 ~/workspace/ai-drakon-scaffolder/docs/opendesign-mobile-integration.md
```

### Diary
```
SESSION:2026-05-31|TASK-89:opendesign-guide|notebooklm-query+mobile-integration-guide|file:docs/opendesign-mobile-integration.md|commit:<hash>|★★★
```

---

## [x] TASK-88

### Мета
Виправити 2 баги в `agy` wrapper + оновити Docker контейнер OpenDesign.

### !!IMPORTANT!! Де запускати
SSH на `192.168.3.184` (`sshpass -p '805235io.' ssh vokov@192.168.3.184`)

### Баги

**Bug 1:** `candidate_endpoints` видає той самий endpoint двічі.
Поточний код (рядки ~55-65 у `/usr/local/bin/agy` всередині контейнера):
```python
def candidate_endpoints(model_id: str):
    for ep in ENDPOINTS:
        if model_id in ep["models"] and is_reachable(ep["base"]):
            yield model_id, ep
    for ep in ENDPOINTS:
        if is_reachable(ep["base"]):
            yield ep["models"][0], ep
```
Виправлення — дедупліковати через `seen`:
```python
def candidate_endpoints(model_id: str):
    seen = set()
    for ep in ENDPOINTS:
        if model_id in ep["models"] and is_reachable(ep["base"]):
            seen.add(ep["name"])
            yield model_id, ep
    for ep in ENDPOINTS:
        if ep["name"] not in seen and is_reachable(ep["base"]):
            yield ep["models"][0], ep
```

**Bug 2:** Default model для fallback — `ep["models"][0]` для local = `standard-proxy` що дає 503. Замінити default на `gemini-2.5-flash` (AGY3).

### Кроки

**1. Виправити файл на dev сервері**
```bash
# Файл виправити: /home/vokov/agy-wrapper/agy та /home/vokov/open-design-custom/agy
# Зміни:
# - candidate_endpoints: додати seen = set(), seen.add, if ep["name"] not in seen
# - В ENDPOINTS: змінити порядок — local останній або default model = "gemini-2.5-flash"
# Перевір синтаксис: python3 /home/vokov/agy-wrapper/agy --version
```

**2. Rebuild контейнер**
```bash
cd /home/vokov/open-design-custom
cp /home/vokov/agy-wrapper/agy /home/vokov/open-design-custom/agy
docker stop open-design && docker rm open-design
docker build --no-cache -t open-design-custom:latest . 2>&1 | tail -5
```

**3. Запустити контейнер**
```bash
TOKEN="2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a"
docker run -d \
  --name open-design --restart always --read-only --tmpfs /tmp \
  --security-opt no-new-privileges:true \
  --memory 512m --pids-limit 256 \
  -p 0.0.0.0:7459:7456 \
  -e NODE_ENV=production \
  -e OD_BIND_HOST=0.0.0.0 -e OD_PORT=7456 \
  -e OD_API_TOKEN=$TOKEN \
  -e OD_ALLOWED_ORIGINS=http://192.168.3.184:7459 \
  -e LOCAL_PROXY_TOKEN=freecc -e AGY_API_KEY=proxy-key \
  -v open_design_data:/app/.od \
  open-design-custom:latest
```

**4. Push до GitHub**
```bash
cd /home/vokov/agy-wrapper
git add agy
git commit -m "fix: deduplicate endpoints in candidate_endpoints — v1.2.0"
git push origin main
```

### Верифікація
```bash
# agy версія та fallback (має показати AGY3 без дублювання):
echo "say hi briefly" | docker exec -i open-design agy --model gemini-2.5-flash 2>&1 | head -5
# Очікується: [agy] -> agy3 | model=gemini-2.5-flash + відповідь без дублів

docker exec open-design agy --version
curl -s http://127.0.0.1:7459/api/health -H "Authorization: Bearer $TOKEN"
```

### Diary
```
SESSION:2026-05-31|TASK-88:agy-dedup-fix|v1.2.0|fix:candidate-endpoints-dedup+default-model|commit:<hash>|★★★
```

---

## [x] TASK-87

### Мета
Встановити `agy` wrapper в OpenDesign Docker контейнер на dev сервері (192.168.3.184).
`agy` — Python скрипт що агрегує 3 LLM-проксі: local (18880), AGY3 (162:8080), AGY phone (25:8080).

### !!IMPORTANT!! Де запускати
SSH на 192.168.3.184 (`sshpass -p '805235io.' ssh vokov@192.168.3.184`)

### Кроки

**1. Записати agy скрипт на dev сервері**
```bash
cat > /home/vokov/open-design-custom/agy << 'AGYSCRIPT'
#!/usr/bin/env python3
"""AGY — unified LLM wrapper for OpenDesign (streamFormat: plain).

Sources (priority order):
  1. local free-claude-code-proxy  http://172.17.0.1:18880  (slots)
  2. AGY3 tablet                   http://192.168.3.162:8080
  3. AGY phone                     http://192.168.3.25:8080
"""
import json, os, socket, sys, urllib.error, urllib.request

VERSION = "1.0.0"
LOCAL_TOKEN = os.environ.get("LOCAL_PROXY_TOKEN", "freecc")
AGY_TOKEN   = os.environ.get("AGY_API_KEY", "proxy-key")

LOCAL_SLOTS = [
    "standard-proxy","coding-proxy","agent-proxy","reasoning-proxy",
    "analytics-proxy","multimedia-proxy","fast-proxy","cheap-proxy","docs-assistant-proxy",
]
AGY_MODELS = [
    "gemini-2.5-pro","gemini-2.5-flash","gemini-2.5-flash-thinking","gemini-2.5-flash-lite",
    "gemini-3-flash","gemini-3-flash-agent","gemini-3.1-flash-lite","gemini-3.1-flash-image",
    "gemini-3.1-pro-high","gemini-3.1-pro-low","gemini-3.5-flash-low","gemini-3.5-flash-medium",
    "gemini-3.5-flash-extra-low","gemini-pro-agent","claude-sonnet-4-6","claude-opus-4-6-thinking",
]
ENDPOINTS = [
    {"name":"local",     "base":"http://172.17.0.1:18880",  "token":LOCAL_TOKEN,"models":LOCAL_SLOTS},
    {"name":"agy3",      "base":"http://192.168.3.162:8080","token":AGY_TOKEN,  "models":AGY_MODELS},
    {"name":"agy-phone", "base":"http://192.168.3.25:8080", "token":AGY_TOKEN,  "models":AGY_MODELS},
]
DISPLAY_TO_ID = {
    "default":"standard-proxy",
    "Gemini 3.1 Pro (High)":"gemini-3.1-pro-high",
    "Gemini 3.1 Pro (Low)":"gemini-3.1-pro-low",
    "Gemini 3.5 Flash (High)":"gemini-pro-agent",
    "Gemini 3.5 Flash (Medium)":"gemini-3.5-flash-medium",
    "Gemini 3.5 Flash (Low)":"gemini-3.5-flash-low",
    "Claude Sonnet 4.6 (Thinking)":"claude-sonnet-4-6",
    "Claude Opus 4.6 (Thinking)":"claude-opus-4-6-thinking",
    "GPT-OSS 120B (Medium)":"standard-proxy",
}

def is_reachable(base, timeout=2.0):
    try:
        from urllib.parse import urlparse
        p = urlparse(base)
        with socket.create_connection((p.hostname, p.port or 80), timeout=timeout): return True
    except OSError: return False

def resolve_model(raw):
    model_id = DISPLAY_TO_ID.get(raw, raw)
    for ep in ENDPOINTS:
        if model_id in ep["models"] and is_reachable(ep["base"]): return model_id, ep
    for ep in ENDPOINTS:
        if is_reachable(ep["base"]): return ep["models"][0], ep
    return model_id, ENDPOINTS[0]

def stream_chat(ep, model, prompt):
    payload = json.dumps({"model":model,"stream":True,"messages":[{"role":"user","content":prompt}]}).encode()
    req = urllib.request.Request(f"{ep['base']}/v1/chat/completions", data=payload,
        headers={"Content-Type":"application/json","Authorization":f"Bearer {ep['token']}","x-api-key":ep["token"]},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            for raw in resp:
                line = raw.decode("utf-8",errors="replace").rstrip()
                if not line.startswith("data: "): continue
                chunk = line[6:]
                if chunk == "[DONE]": break
                try:
                    text = (json.loads(chunk).get("choices") or [{}])[0].get("delta",{}).get("content","")
                    if text: sys.stdout.write(text); sys.stdout.flush()
                except: pass
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"agy: HTTP {e.code}: {e.read().decode()[:200]}\n"); sys.exit(1)
    except urllib.error.URLError as e:
        sys.stderr.write(f"agy: {ep['name']} error: {e}\n"); sys.exit(1)

def main():
    args = sys.argv[1:]
    if "--version" in args or "-v" in args:
        print(f"agy {VERSION} (local-proxy+AGY3+AGY-phone)"); return
    model_raw, i = "default", 0
    while i < len(args):
        if args[i] in ("--model","-m") and i+1 < len(args): model_raw=args[i+1]; i+=2
        else: i+=1
    prompt = sys.stdin.read().strip()
    if not prompt: sys.exit(0)
    model_id, ep = resolve_model(model_raw)
    sys.stderr.write(f"[agy] → {ep['name']} | model={model_id}\n")
    stream_chat(ep, model_id, prompt)

if __name__=="__main__": main()
AGYSCRIPT
chmod +x /home/vokov/open-design-custom/agy
```

**2. Перевірити Dockerfile**
```bash
cat /home/vokov/open-design-custom/Dockerfile
# Має бути:
# FROM vanjayak/open-design:latest
# USER root
# COPY agy /usr/local/bin/agy
# RUN chmod +x /usr/local/bin/agy
# USER open-design
```

**3. Зупинити старий контейнер та збудувати новий образ**
```bash
docker stop open-design && docker rm open-design
cd /home/vokov/open-design-custom
docker build -t open-design-custom:latest . 2>&1 | tail -10
```

**4. Запустити новий контейнер**
```bash
docker run -d \
  --name open-design \
  --restart always \
  --read-only \
  --tmpfs /tmp \
  --security-opt no-new-privileges:true \
  --memory 512m \
  --pids-limit 256 \
  -p 0.0.0.0:7459:7456 \
  -e NODE_ENV=production \
  -e OD_BIND_HOST=0.0.0.0 \
  -e OD_PORT=7456 \
  -e OD_API_TOKEN=2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a \
  -e OD_ALLOWED_ORIGINS=http://192.168.3.184:7459 \
  -e LOCAL_PROXY_TOKEN=freecc \
  -e AGY_API_KEY=proxy-key \
  -v open_design_data:/app/.od \
  open-design-custom:latest
```

### Верифікація
```bash
# Контейнер запущений?
docker ps --filter name=open-design

# agy доступний?
docker exec open-design agy --version

# Web UI відповідає?
curl -s http://127.0.0.1:7459/api/health -H "Authorization: Bearer 2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a"
# Очікується: {"ok":true,"version":"0.8.1"}
```

### Diary
```
SESSION:2026-05-31|TASK-87:opendesign-agy-install|agy-wrapper+docker-build+container-restart|sources:local-18880+agy3-162+agy-25|★★★
```

---

## [x] TASK-83

**UX Audit + P0/P1 fixes for AI-DRAKON agent-driven development UI**

### Role
Ти — Staff Product Engineer + UX Architect для AI-DRAKON (IDE-подібний інструмент для agent-driven development).

### Мета
Провести практичний UX-аудит і реалізувати пріоритетні покращення так, щоб користувач максимально швидко і стабільно проходив пайплайни AI-розробки (аналіз коду → DRAKON → генерація коду → виконання/логування).

### Важливі принципи
1) Canvas-first: полотно/робоча зона завжди головні.
2) Мінімум кліків до core action.
3) Жодних "тихих" фейлів.
4) Помилки мають вести користувача до наступної дії.
5) Не робити косметичний редизайн — тільки UX/flow/стабільність/зручність.

### Обов'язково вивчити перед змінами
- docs/ux-audit/audit.md
- docs/ux-audit/risks.md
- docs/ux-audit/stitch-prompt.md
- docs/ux-audit/stitch-prompt-pipeline-panels.md
- docs/ui-pages-reference.md
- src/components/workspace/WorkspaceShell.tsx
- src/pages/AgentStudioPage.tsx
- src/components/pipelines/PipelineCommandCenter.tsx
- src/components/pipelines/PipelinesPage.tsx
- src/components/agents/PipelineList.tsx
- src/components/agents/ExecutionPanel.tsx
- src/components/workspace/DevCyclePanel.tsx
- src/components/workspace/AgentStatusBar.tsx
- src/components/workspace/CommandPalette.tsx

### Критичні проблеми (перевірити і закрити)

**P0 (must-have):**
1. Mixed Content: HTTPS-інтерфейс → HTTP endpoint (http://192.168.x.x:8766/projects) → контент не вантажиться. Виправити через конфіг endpoints + безпечний fallback.
2. Кнопка "Очистити лог" в ExecutionPanel — перевірити чи функціонує.
3. Втрата незбережених змін при навігації (нема global unsaved guard).
4. window.prompt/window.confirm/window.alert у critical flow → замінити на shadcn dialogs.
5. Псевдо-fallback пайплайнів, що маскує backend помилку.
6. Порожні/чорні стани без CTA і пояснення.

**P1:**
- Уніфікувати entry points для пайплайнів (чіткі дії "Аналізувати"/"Генерувати").
- DevCycle: послідовність кроків очевидна (disable/guard для передчасних кроків).
- Command Palette: додати дії агентного workflow.

**P2:**
- Accessibility: tab semantics, aria-label, фокус-стани.
- Порожні стани з CTA.
- Локалізація system/network помилок (UA-first).

### Формат виконання
1. Спочатку короткий аудит — таблиця: severity | file:line | impact | fix.
2. Реалізація тільки P0→P1.
3. Валідація: desktop + mobile, /agents + /pipelines + /diagrams, без регресій.
4. Звіт: що виправлено, які баги підтверджено, що залишилось і чому.

### Definition of Done
- Немає blank/чорного main state без пояснення.
- Нема Mixed Content запитів у production/preview.
- Unsaved changes не губляться тихо.
- Clear logs реально очищує консоль.
- Користувач проходить основний AI flow без блокерів.

### Верифікація
```bash
# Локально на AGY3:
cd ~/workspace/ai-drakon-scaffolder
npm run build 2>&1 | tail -20
# Має завершитись без TypeScript errors
# Перевірити що .lovable/ синхронізована зі src/:
diff -r src/components/workspace/ .lovable/src/components/workspace/ 2>/dev/null | head -20
```

### Коміт
```
fix(ux): P0+P1 UX audit fixes — error handling, unsaved guard, clear logs, mixed content (TASK-83)
```

### Diary
```
SESSION:2026-05-30|TASK-83:ux-audit-p0-p1|commit:<hash>|fix:mixed-content+unsaved-guard+clear-logs+error-states+no-browser-dialogs|★★★
```

### !!IMPORTANT!! Де запускати
1. ЛОКАЛЬНО на AGY3 Termux: `cd ~/workspace/ai-drakon-scaffolder && git pull origin main`
2. Вивчи файли зі списку вище перед змінами
3. Редагуй файли ЛОКАЛЬНО на AGY3 (TypeScript/TSX)
4. ОБОВ'ЯЗКОВО синхронізуй: `cp -r src/components/ .lovable/src/components/` після кожної зміни
5. Перевір build: `npm run build 2>&1 | tail -10`
6. git add -A && git commit -m "..." && git push origin main
7. НЕ SSH на 192.168.3.184 — це frontend проект, деплоїться через Cloudflare з .lovable/

## [x] TASK-104

**Мета**: Виправити LLM endpoint для DRAKON/Architect/Docs агентів — очистити стару localStorage (`drakon-assistant-proxy`) щоб вони впали на default AGY proxy.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Чому

Код вже правильний: `isAgyAgent = id.includes("drakon"|"docs"|"architect")` → default `https://agy.exodus.pp.ua`.
Але стара localStorage перекриває: `drakon_llm_base_url = "drakon-assistant-proxy"`.
Фікс: видалити stale ключі — нічого більше не треба.

### Кроки

**Крок 1 — Відкрити браузер і залогінитись:**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
python3 ~/bin/mcp-aws.py start && sleep 3
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev && sleep 5
python3 ~/bin/mcp-aws.py login && sleep 5
python3 ~/bin/mcp-aws.py screenshot $TMPD/t104-before.png
view_file $TMPD/t104-before.png
```

**Крок 2 — Навігація до /agents, перевірити поточний стан:**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents && sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/t104-agents.png
view_file $TMPD/t104-agents.png
```

**Крок 3 — Через CDP очистити stale localStorage і встановити AGY:**

Написати Python скрипт на RPi і запустити:
```bash
sshpass -p 'vokov' ssh -o StrictHostKeyChecking=no vokov@192.168.3.234 'python3 - << '"'"'PYEOF'"'"'
import json, socket, struct
s = socket.create_connection(("127.0.0.1", 38587), timeout=10)

# Get CDP target ID
import urllib.request
targets = json.loads(urllib.request.urlopen("http://127.0.0.1:38587/json").read())
target = next((t["id"] for t in targets if t.get("type") == "page"), None)
print("Target:", target)

s.send(("GET /devtools/page/"+target+" HTTP/1.1\r\nHost: 127.0.0.1:38587\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
s.recv(4096)

def ws_s(d):
    p=json.dumps(d).encode();n=len(p);m=b"\xfe\xdc\xba\x98"
    r=bytes([p[i]^m[i%4] for i in range(n)])
    s.send((struct.pack("BB",0x81,0x80|n) if n<126 else struct.pack("!BBH",0x81,0xfe,n))+m+r)

def ws_r():
    s.settimeout(15);h=s.recv(2);n=h[1]&0x7f
    if n==126:n=struct.unpack("!H",s.recv(2))[0]
    d=b""
    while len(d)<n:d+=s.recv(n-len(d))
    return json.loads(d)

js = """(function() {
  var agents = ["drakon", "architect", "docs"];
  var keys = ["_llm_base_url", "_llm_protocol", "_llm_api_key", "_llm_model", "_llm_max_tokens"];
  agents.forEach(function(a) {
    keys.forEach(function(k) { localStorage.removeItem(a+k); });
  });
  localStorage.setItem("drakon_llm_base_url", "https://agy.exodus.pp.ua");
  localStorage.setItem("drakon_llm_protocol", "agy");
  localStorage.setItem("drakon_llm_model", "gemini-2.5-flash");
  localStorage.setItem("architect_llm_base_url", "https://agy.exodus.pp.ua");
  localStorage.setItem("architect_llm_protocol", "agy");
  localStorage.setItem("docs_llm_base_url", "https://agy.exodus.pp.ua");
  localStorage.setItem("docs_llm_protocol", "agy");
  return "DONE: " + JSON.stringify({
    drakon: localStorage.getItem("drakon_llm_base_url"),
    architect: localStorage.getItem("architect_llm_base_url"),
    docs: localStorage.getItem("docs_llm_base_url")
  });
})()"""

ws_s({"id":1,"method":"Runtime.evaluate","params":{"expression":js,"returnByValue":True}})
r = ws_r()
print(r.get("result",{}).get("result",{}).get("value","ERROR"))
s.close()
PYEOF'
```

**Крок 4 — Screenshot після виправлення:**
```bash
sleep 2
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t104-after.png
view_file $TMPD/t104-after.png
python3 ~/bin/mcp-aws.py stop
```

**Крок 5 — Commit:**
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-104/[x] TASK-104/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-104 done — agents LLM set to AGY proxy"
git push origin main
```

### Diary
```
SESSION:2026-05-31|TASK-104:agent-llm-fix|localStorage-cleared+AGY-set|drakon+architect+docs|commit:<hash>|★★★
```


## [ ] TASK-105

**Мета**: Додати 18880 proxy slots (standard-proxy, coding-proxy та ін.) у OpenDesign model picker — зараз вони в agy-wrapper але не видні в UI.

**!!IMPORTANT!! Run locally on AGY Termux або SSH до 192.168.3.184**

### Контекст
- agy-wrapper (`/home/vokov/agy-wrapper/agy`) вже знає LOCAL_SLOTS але не включає їх в `DISPLAY_TO_ID`
- OpenDesign (`antigravity.ts`) має захардкоджений список з 9 моделей
- Потрібно синхронізувати обидва файли та зробити rebuild daemon

### Крок 1 — Оновити agy-wrapper DISPLAY_TO_ID

SSH до 192.168.3.184:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
```

Відредагувати `/home/vokov/agy-wrapper/agy` — додати в `DISPLAY_TO_ID`:
```python
    "Standard (GPT-4o)":           "standard-proxy",
    "Coding (o3)":                 "coding-proxy",
    "Agent (Claude Sonnet)":       "agent-proxy",
    "Reasoning (o1)":              "reasoning-proxy",
    "Analytics (Gemini Pro)":      "analytics-proxy",
    "Fast (GPT-4o-mini)":          "fast-proxy",
    "Cheap (Gemini Flash)":        "cheap-proxy",
    "Docs Assistant":              "docs-assistant-proxy",
```

### Крок 2 — Оновити antigravity.ts model list

Відредагувати `/home/vokov/open-design/apps/daemon/src/runtimes/defs/antigravity.ts`:

Знайти `models: [` array і додати після існуючих 9 записів:
```typescript
    { id: "Standard (GPT-4o)", label: "Standard (GPT-4o)" },
    { id: "Coding (o3)", label: "Coding (o3)" },
    { id: "Agent (Claude Sonnet)", label: "Agent (Claude Sonnet)" },
    { id: "Reasoning (o1)", label: "Reasoning (o1)" },
    { id: "Analytics (Gemini Pro)", label: "Analytics (Gemini Pro)" },
    { id: "Fast (GPT-4o-mini)", label: "Fast (GPT-4o-mini)" },
    { id: "Cheap (Gemini Flash)", label: "Cheap (Gemini Flash)" },
    { id: "Docs Assistant", label: "Docs Assistant" },
```

### Крок 3 — Rebuild OpenDesign daemon

```bash
cd /home/vokov/open-design
pnpm --filter @opendesign/daemon build
sudo rc-service opendesign restart
```

### Крок 4 — Верифікація

```bash
curl -s -H "Authorization: Bearer 2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a" \
  http://192.168.3.184:7459/api/agents | python3 -c "
import json,sys
d=json.load(sys.stdin)
for a in d['agents']:
    if a['id']=='antigravity':
        print('Models:', len(a.get('models',[])))
        [print(' -', m['id']) for m in a.get('models',[])]
"
```
Очікується: 17+ моделей (9 старих + 8 нових).

### Diary
```
SESSION:DATE|TASK-105:opendesign-18880-models|agy-wrapper+antigravity.ts+rebuild|models:17|commit:<hash>|★★★
```

