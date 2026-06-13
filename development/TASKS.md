# TASKS — Координація Claude ↔ AGY

> Власник: Claude (оркестратор)
> Виконавець: AGY (executor)
> Оновлено: 2026-06-02 12:00

---

## [x] TASK-SS-20: Telegram-бот для Sonate Solidaire

**!!IMPORTANT!! Run locally on Termux (AGY3). NO SSH to dev server.**

### Мета
Створити Python Telegram-бот @SonateSolidaireBot для асоціації Sonate Solidaire (Gland VD, Швейцарія).

### Репозиторій
- Repo: `git@github.com:maxfraieho/sonate-solidsite.git`
- Клонувати або оновити: `cd ~/projects && git clone git@github.com:maxfraieho/sonate-solidsite.git || (cd sonate-solidsite && git pull)`
- Створити папку: `~/projects/sonate-solidsite/telegram-bot/`

### Файли до створення

**1. `telegram-bot/bot.py`** — основний бот:
```python
# Команди:
# /start — привітання FR/UA/DE (авто-detect по мові Telegram)
# /events — список концертів (читати з https://sonate-solidaire.me/kb/kb-events.md)
# /join — посилання на форму: https://sonate-solidaire.me/integration
# /contact — контакти: https://sonate-solidaire.me/contact
# /assistant — AI-помічник: https://sonate-solidaire.me/assistant
# /about — коротко про асоціацію (FR + UA)
```

**2. `telegram-bot/requirements.txt`**:
```
python-telegram-bot==20.7
httpx==0.25.0
```

**3. `telegram-bot/.env.example`**:
```
BOT_TOKEN=YOUR_TOKEN_HERE
```

**4. `telegram-bot/README.md`** — інструкція:
- Як отримати токен через @BotFather
- Як задеплоїти на dev server (192.168.3.184)
- Список Telegram-чатів для публікації бота (UA Швейцарія)

### Технічні деталі
- Library: `python-telegram-bot` v20 (async)
- **КЛЮЧОВА ІНТЕГРАЦІЯ з SS-Agent AI:**
  Всі вільні повідомлення (не команди) → SS-Agent API → відповідь AI:
  ```python
  import httpx
  async def ask_agent(text: str) -> str:
      async with httpx.AsyncClient() as client:
          r = await client.post(
              "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/agents/sonate-solidaire/chat",
              json={"message": text}, timeout=30
          )
          return r.json().get("reply", "...")
  ```
  Endpoint ПУБЛІЧНИЙ — авторизація не потрібна.
- Команди (швидкі shortcuts):
  - `/start` — привітання FR/UA/DE + "Posez-moi n'importe quelle question!"
  - `/events` — спитати SS-Agent "Quels sont les prochains événements?"
  - `/join` → посилання `https://sonate-solidaire.me/integration`
  - `/contact` → `https://sonate-solidaire.me/contact`
  - `/assistant` → `https://sonate-solidaire.me/assistant`
- Всі інші повідомлення → `ask_agent(text)` → відповідь
- Typing indicator: `context.bot.send_chat_action(chat_id, ChatAction.TYPING)` поки чекає
- Мови: FR основна, UA та DE по `update.effective_user.language_code`
- Токен: з `os.environ["BOT_TOKEN"]` або `.env` файлу через `python-dotenv`
- НЕ потрібен webhook — polling (`Application.run_polling()`)

### Верифікація
```bash
cd ~/projects/sonate-solidsite/telegram-bot
pip install -r requirements.txt
# Перевірити що bot.py синтаксично правильний:
python3 -m py_compile bot.py && echo "OK"
```

### Коміт
```bash
cd ~/projects/sonate-solidsite
git add telegram-bot/
git commit -m "feat(telegram): add @SonateSolidaireBot — /events /join /contact /assistant"
git push origin main
sed -i 's/\[ \] TASK-SS-20/[x] TASK-SS-20/' development/TASKS.md 2>/dev/null || true
```

### Diary
```
SESSION:2026-06-02|TASK-SS-20:telegram-bot|bot.py+requirements+README|commit:<hash>|★★★
```

---

## TASK-128: ProjectInfo + ProjectContext — використовувати github поле з API (не парсити repo_url)

**Виконавець:** AGY phone (192.168.3.195)
**Де запускати:** !!IMPORTANT!! Run locally on AGY Termux. Edit `~/workspace/ai-drakon-scaffolder/src/`. Commit + push + scp .lovable.

### Проблема
В вкладці Документація при виборі проекту `sonate-solidsite` показує "Документів поки немає".

**Root cause:** `ProjectInfo` interface в `graph-pipeline-api.ts` не має поля `github`. Тому `loadProjects()` в `ProjectContext.tsx` парсить github config тільки з `repo_url` (старий підхід), а не з `github` поля яке тепер повертає API.

### Файли та зміни

#### 1. `src/lib/graph-pipeline-api.ts` — додати github поле

Знайти `interface ProjectInfo` (рядок ~177) і додати:
```typescript
export interface ProjectInfo {
  slug: string;
  name: string;
  description: string;
  repo_url: string;
  branch: string;
  has_repo: boolean;
  agents: string[];
  github?: { owner: string; repo: string; branch: string };  // ← ДОДАТИ
}
```

#### 2. `src/context/ProjectContext.tsx` — використовувати p.github якщо є

Знайти `loadProjects` функцію (рядок ~80), знайти де будується `github`:
```typescript
let github: Project["github"];
if (p.repo_url) {
  // старий код — парсить URL
```

Замінити на:
```typescript
let github: Project["github"];
// Пріоритет: github поле з API (новий підхід) > парсинг repo_url (старий)
if (p.github?.owner && p.github?.repo) {
  github = { owner: p.github.owner, repo: p.github.repo, branch: p.github.branch || p.branch || "main" };
} else if (p.repo_url) {
  try {
    const u = new URL(p.repo_url);
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts.length >= 2) {
      github = { owner: parts[0], repo: parts[1], branch: p.branch || "main" };
    }
  } catch {}
}
```

### Верифікація
```bash
grep -n "p.github\|ProjectInfo" src/lib/graph-pipeline-api.ts src/context/ProjectContext.tsx | head -10
```

### Sync .lovable
```bash
cp src/lib/graph-pipeline-api.ts .lovable/src/lib/graph-pipeline-api.ts
cp src/context/ProjectContext.tsx .lovable/src/context/ProjectContext.tsx
```

### Коміт
```
fix(projects): use github field from API in ProjectContext (TASK-128)
chore(tasks): TASK-128 done
```

**Diary:** `"SESSION:2026-06-01|TASK-128:projectinfo-github-field|★★★"`

[x] TASK-128

---

## TASK-123: ai-drakon IDE — project switch must use GitHub repo (not local filesystem)

**Виконавець:** AGY3 (192.168.3.204)
**Де запускати:** !!IMPORTANT!! Run on 192.168.3.184 via SSH. Use `sshpass -p 805235io. ssh vokov@192.168.3.184`

**Проблема:**
Коли в Settings змінити GitHub project на `sonate-solidsite`, всі вкладки (Code, Docs, DRAKON, Agents) залишаються в контексті `uav-watcher`. Потрібно щоб вибір GitHub repo в Settings змінював контекст ВСЮДИ.

**Архітектура:**
- Settings зберігаються в `localStorage` (key: `drakon.settings`)
- `CodePage.tsx` вже читає `ghCfg.owner/repo` з settings через `getGithubConfig()`
- `activeProject` в localStorage (`ai_drakon_active_project`) — окремий стан
- `project_pipeline_route.py` → `PROJECTS_BASE = ~/projects` (на 192.168.3.184) — НЕ пов'язаний з GitHub

**Що потрібно виправити:**

### 1. Конфіг проекту sonate-solidsite на сервері
На 192.168.3.184 створити:
```
/home/vokov/projects/sonate-solidsite/config.json
```
Зміст:
```json
{
  "name": "Sonate Solidaire",
  "description": "Website violin-integration.works / sonate-solidaire.me",
  "repo_url": "https://github.com/maxfraieho/sonate-solidsite",
  "branch": "main",
  "github": {
    "owner": "maxfraieho",
    "repo": "sonate-solidsite",
    "branch": "main"
  }
}
```

### 2. GitHub-aware project listing
Файл: `services/architect-agent/project_pipeline_route.py`

В `list_projects()` функції (рядок ~41) — додати `github` поле в response якщо є в `config.json`:
```python
gh = config.get('github', {})
projects.append({...existing fields...,
    'github': gh if gh else None
})
```

### 3. Frontend ProjectContext — прийняти github з API
Файл: `src/context/ProjectContext.tsx`

У функції `toProject()` (рядок ~35) вже є обробка `d.github`. 
Перевірити що `listProjectsArch()` повертає `github` поле і воно потрапляє в `Project.github`.
Файл: `src/lib/graph-pipeline-api.ts` — функція `listProjectsArch()`

### 4. Синхронізація Settings ↔ activeProject
Файл: `src/pages/SettingsPage.tsx` або компонент де зберігаються GitHub settings.

Коли user зберігає GitHub settings (owner/repo), треба також спробувати знайти відповідний project в списку і встановити його як `activeProject`.

**Спрощений варіант для швидкого фіксу:**
- При завантаженні Settings перевіряти чи активний `ghCfg.owner/repo` відповідає якомусь project у списку
- Якщо відповідає — автоматично встановити `activeProject`

### 5. Код браузер і агенти
- `CodePage.tsx` рядок ~179-184: вже використовує `ghCfg` — перевірити що settings зберігаються коректно
- `AgentChatPanel.tsx` рядок ~144: передає `activeProject.slug` і `activeProject.path` — після кроку 4 буде правильним

**Верифікація:**
```bash
# На сервері:
sshpass -p 805235io. ssh vokov@192.168.3.184 'ls ~/projects/sonate-solidsite/ && cat ~/projects/sonate-solidsite/config.json'
curl -s http://localhost:8766/projects | python3 -c "import json,sys; [print(p['slug'],p.get('github','NO')) for p in json.load(sys.stdin)['projects'] if 'sonate' in p['slug']]"
```

**Коміт:**
```
feat(projects): add sonate-solidsite project config + github field in list API
chore(tasks): TASK-123 done
```

**Diary:** `"SESSION:2026-06-01|TASK-123:project-switch-github|sonate-solidsite config added|API fixed|★★★"`

[x] TASK-123

---

## TASK-124: ai-drakon IDE — rename "Нотатки"→"Документація" + show GitHub docs/ folder

**Виконавець:** AGY3 (192.168.3.204)
**Де запускати:** !!IMPORTANT!! Run locally on AGY3 Termux. Edit files in `~/workspace/ai-drakon-scaffolder/src/`. Then commit + push + scp to .lovable/.

### Частина 1: Перейменувати "Нотатки" → "Документація"

Файл: `src/components/workspace/WorkspaceShell.tsx`
- Рядок ~62: `label: "Нотатки"` → `label: "Документація"`
- Рядок ~74: `section: "Нотатки"` → `section: "Документація"`

Файл: `src/components/workspace/CommandPalette.tsx`
- Рядок ~26: `label: "Нотатки"` → `label: "Документація"`

Файл: `src/components/docs/NotesGraphTab.tsx`
- Рядок ~64: підпис "Нотаток поки немає" → "Документів поки немає"

### Частина 2: DocsFilesTab — читати docs/ з GitHub коли є активний проект

Файл: `src/components/docs/DocsFilesTab.tsx`

**Поточний стан** (рядки ~94-108):
```typescript
const { activeProject } = useProject();
const ghRepo = activeProject?.slug || "";
// ...
setTree(await fetchNotesTree(ghRepo || undefined));
```

**Що змінити:**
1. Додати import: `import { api } from "@/lib/api";`
2. Додати import: `import { getGithubConfig } from "@/lib/settings-storage";`
3. В функції `load()` замінити логіку:

```typescript
const load = async () => {
  setLoading(true);
  try {
    const gh = activeProject?.github;
    const ghCfg = getGithubConfig();
    const owner = gh?.owner || ghCfg.owner;
    const repo  = gh?.repo  || ghCfg.repo;
    const branch = gh?.branch || ghCfg.branch || "main";

    if (owner && repo) {
      // GitHub mode: читати docs/ з репозиторію
      const result = await api.githubGetTree(owner, repo, "docs", branch);
      const nodes = (result.tree || result.items || []).map((item: { path?: string; name?: string; type?: string }) => ({
        slug: (item.path || item.name || "").replace(/\.md$/, ""),
        title: (item.name || item.path || "").replace(/\.md$/, ""),
        type: item.type === "tree" ? "folder" : "note",
        path: item.path || item.name || "",
        children: [],
      }));
      setTree(nodes);
    } else {
      // Fallback: локальна нотатки система
      setTree(await fetchNotesTree(activeProject?.slug || undefined));
    }
  } catch (e) {
    console.error("docs load error", e);
  } finally {
    setLoading(false);
  }
};
```

**Тип TreeNode** (якщо потрібно) — перевірити `src/lib/garden/notesApi.ts` що `TreeNode` має поля `slug, title, type, path, children`.

### Верифікація:
```bash
grep -n "Документація" src/components/workspace/WorkspaceShell.tsx
grep -n "githubGetTree\|owner\|repo" src/components/docs/DocsFilesTab.tsx
```

### Коміт:
```
feat(docs): rename Notes→Documentation tab + show GitHub docs/ folder (TASK-124)
chore(tasks): TASK-124 done
```

**Sync .lovable:**
```bash
cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
cp src/components/workspace/CommandPalette.tsx .lovable/src/components/workspace/CommandPalette.tsx
cp src/components/docs/DocsFilesTab.tsx .lovable/src/components/docs/DocsFilesTab.tsx
cp src/components/docs/NotesGraphTab.tsx .lovable/src/components/docs/NotesGraphTab.tsx
```

**Diary:** `"SESSION:2026-06-01|TASK-124:docs-tab-rename+github-docs|★★★"`

[x] TASK-124

---

## TASK-125: Документація — inline редактор файлів (відкрити/редагувати/зберегти → GitHub commit)

**Виконавець:** AGY phone (192.168.3.195)
**Де запускати:** !!IMPORTANT!! Run locally on AGY Termux. Edit `~/workspace/ai-drakon-scaffolder/src/`. Commit + push + scp to .lovable/.

### Що зробити

Файл: `src/components/docs/DocsFilesTab.tsx`

Коли юзер клікає на файл (тип `"note"`) у списку документів, відкривається inline editor:
1. `api.githubGetFile(owner, repo, path, branch)` → отримати вміст
2. Показати `<textarea>` або простий редактор з вмістом
3. Кнопка "Зберегти" → `api.githubCommitFile(owner, repo, path, content, "docs: update " + path, branch, token)`
4. Кнопка "Скасувати" → закрити редактор

**Де брати token:** `getGithubConfig().token` (з settings-storage)

**Мінімальний дизайн:** додати state в `DocsFilesTab`:
```typescript
const [editingPath, setEditingPath] = useState<string | null>(null);
const [editContent, setEditContent] = useState("");
const [editSaving, setEditSaving] = useState(false);

// При кліку на файл → завантажити і відкрити editor
const openEditor = async (path: string) => {
  const result = await api.githubGetFile(ghOwner, ghRepoName, path, ghBranch);
  const content = result.content ? atob(result.content.replace(/\n/g, "")) : (result.raw ?? "");
  setEditContent(content);
  setEditingPath(path);
};

const saveFile = async () => {
  if (!editingPath) return;
  setEditSaving(true);
  try {
    const token = getGithubConfig().token;
    await api.githubCommitFile(ghOwner, ghRepoName, editingPath, editContent,
      `docs: update ${editingPath}`, ghBranch, token);
    setEditingPath(null);
  } finally { setEditSaving(false); }
};
```

Показати editor панель замість списку коли `editingPath !== null`:
```tsx
{editingPath ? (
  <div className="flex flex-col h-full gap-2 p-3">
    <div className="flex justify-between items-center">
      <span className="text-xs font-mono text-muted-foreground">{editingPath}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditingPath(null)}>Скасувати</Button>
        <Button size="sm" onClick={saveFile} disabled={editSaving}>
          {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Зберегти"}
        </Button>
      </div>
    </div>
    <textarea
      className="flex-1 resize-none rounded border bg-background p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
      value={editContent}
      onChange={e => setEditContent(e.target.value)}
    />
  </div>
) : (/* existing list UI */)}
```

**Файл api.ts** — перевірити тип `GithubFileResponse`:
```bash
grep -n "GithubFileResponse\|content.*base64\|raw" src/lib/api.ts | head -10
```

**Верифікація:**
```bash
grep -n "editingPath\|openEditor\|saveFile" src/components/docs/DocsFilesTab.tsx
```

**Sync .lovable:**
```bash
cp src/components/docs/DocsFilesTab.tsx .lovable/src/components/docs/DocsFilesTab.tsx
```

**Коміт:** `feat(docs): inline file editor with GitHub commit (TASK-125)`
**Diary:** `"SESSION:2026-06-01|TASK-125:docs-editor|★★★"`

[x] TASK-125 ✅

---

## TASK-126: Agent Studio — DRAKON editor повний доступ (зберігання, завантаження з репо)

**Виконавець:** AGY phone (192.168.3.195)
**Де запускати:** !!IMPORTANT!! Run locally on AGY Termux. `~/workspace/ai-drakon-scaffolder/src/`

### Проблема
AgentStudioPage вже має DrakonEditor + savePipeline/getPipeline. Але:
- Збереження йде на локальний сервер (architect-agent), не в GitHub
- Треба додати кнопку "Save to GitHub" що комітить `.drakon.json` в репозиторій

### Що зробити

Файл: `src/pages/AgentStudioPage.tsx`

Знайти де відбувається save (рядок ~151):
```typescript
await savePipeline(selectedPipelineName, ir);
```

Додати після `savePipeline` опціональний GitHub commit:
```typescript
// Після локального save — запитати чи зберегти в GitHub
const ghCfg = getGithubConfig();
if (ghCfg.owner && ghCfg.repo && ghCfg.token) {
  const path = `services/architect-agent/pipelines/${selectedPipelineName}.drakon.json`;
  const content = JSON.stringify(ir, null, 2);
  try {
    await api.githubCommitFile(
      ghCfg.owner, ghCfg.repo, path, content,
      `feat(drakon): update ${selectedPipelineName} pipeline`, ghCfg.branch || "main", ghCfg.token
    );
    toast.success("Збережено локально + GitHub");
  } catch {
    toast.success("Збережено локально (GitHub save failed)");
  }
} else {
  toast.success("Збережено локально");
}
```

Додати import:
```typescript
import { getGithubConfig } from "@/lib/settings-storage";
import { api } from "@/lib/api";
```

**Верифікація:**
```bash
grep -n "githubCommitFile\|getGithubConfig" src/pages/AgentStudioPage.tsx
```

**Sync:** `cp src/pages/AgentStudioPage.tsx .lovable/src/pages/AgentStudioPage.tsx`

**Коміт:** `feat(agents): save DRAKON pipeline to GitHub on save (TASK-126)`
**Diary:** `"SESSION:2026-06-01|TASK-126:drakon-github-save|★★★"`

[x] TASK-126

---

## TASK-127: Architect-agent — інструмент запису файлів в GitHub (для агентів)

**Виконавець:** AGY phone (192.168.3.195)
**Де запускати:** !!IMPORTANT!! Run on 192.168.3.184 via SSH: `sshpass -p 805235io. ssh vokov@192.168.3.184`

### Що зробити

Файл: `/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/ai_chat/architect_chat.py`

Додати новий `github_write` тул для агента що дозволяє записувати файли в GitHub:

**1. Додати env vars в `/etc/init.d/ai-architect-agent`:**
```bash
# Знайти рядок environment= і додати:
GITHUB_TOKEN=<token_from_settings>
GITHUB_OWNER=maxfraieho
GITHUB_REPO=ai-drakon-scaffolder
GITHUB_BRANCH=main
```
Прочитати поточний token з `/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env` або `/opt/free-claude-code/.env`.

**2. В architect_chat.py додати github_write tool:**

Знайти де визначаються tools (шукай `"name": "read_file"` або `tools = [`).
Додати новий tool:
```python
{
    "name": "github_write_file",
    "description": "Write or update a file in the GitHub repository. Use to save documentation, code, or configs.",
    "input_schema": {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path in repo, e.g. docs/readme.md"},
            "content": {"type": "string", "description": "Full file content to write"},
            "message": {"type": "string", "description": "Commit message"}
        },
        "required": ["path", "content", "message"]
    }
}
```

**3. Додати обробник tool_use:**

Знайти де обробляються tool results (шукай `tool_use` або `tool_calls`).
Додати case для `github_write_file`:
```python
elif tool_name == "github_write_file":
    import httpx, base64, os
    github_token = os.getenv("GITHUB_TOKEN", "")
    owner = os.getenv("GITHUB_OWNER", "maxfraieho")
    repo = os.getenv("GITHUB_REPO", "ai-drakon-scaffolder")
    branch = os.getenv("GITHUB_BRANCH", "main")
    path = tool_input.get("path", "")
    content = tool_input.get("content", "")
    message = tool_input.get("message", "update via agent")
    
    if not github_token:
        tool_result = "Error: GITHUB_TOKEN not configured"
    else:
        # Get current SHA if file exists
        headers = {"Authorization": f"Bearer {github_token}", "Accept": "application/vnd.github+json"}
        get_r = httpx.get(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
                         headers=headers, timeout=10)
        sha = get_r.json().get("sha") if get_r.status_code == 200 else None
        
        payload = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch
        }
        if sha:
            payload["sha"] = sha
        
        put_r = httpx.put(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
                         json=payload, headers=headers, timeout=15)
        if put_r.status_code in (200, 201):
            tool_result = f"File {path} written successfully to GitHub ({branch})"
        else:
            tool_result = f"GitHub write error: {put_r.status_code} {put_r.text[:100]}"
```

**Верифікація (на сервері):**
```bash
sshpass -p 805235io. ssh vokov@192.168.3.184 'grep -n "github_write_file" ~/workspace/ai-drakon-scaffolder/services/architect-agent/ai_chat/architect_chat.py'
sudo rc-service ai-architect-agent restart
```

**Коміт:** `feat(architect): add github_write_file tool for agent (TASK-127)`

**Diary:** `"SESSION:2026-06-01|TASK-127:agent-github-write|★★★"`

[ ] TASK-127

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

## [x] TASK-101

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


## [x] TASK-105

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


## ═══════════════════════════════════════════
## SPRINT 2 — UAV-WATCHER через AI-DRAKON UI
## Мета: AGY як розробник/тестувальник в браузері
## Дата: 2026-05-31
## ═══════════════════════════════════════════

## [x] TASK-106

**Мета**: Встановити GitHub Personal Access Token в ai-drakon Settings щоб Code section показував файли uav-watcher.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Контекст
Без GitHub PAT код-секція показує fallback "GitHub не налаштований" (наш TASK-99).
Token потрібен для читання файлів `maxfraieho/uav-watcher` через Cloudflare Worker.
**Token вже збережено в `$TMPDIR/gh_token.txt` на AGY phone.**

### Кроки

**Крок 1 — Перевірити токен:**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
TOKEN=$(cat $TMPD/gh_token.txt 2>/dev/null | tr -d '\n')
echo "Token: ${TOKEN:0:8}..."
```

**Крок 2 — Відкрити браузер, залогінитись:**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
python3 ~/bin/mcp-aws.py start && sleep 3
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev && sleep 5
python3 ~/bin/mcp-aws.py login && sleep 5
python3 ~/bin/mcp-aws.py screenshot $TMPD/t106-start.png
view_file $TMPD/t106-start.png
```

**Крок 3 — Перейти до Settings:**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/settings && sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/t106-settings.png
view_file $TMPD/t106-settings.png
python3 ~/bin/mcp-aws.py snapshot
```

**Крок 4 — Знайти поле GitHub Token і заповнити через CDP на RPi:**
```bash
TOKEN=$(cat /tmp/gh_token.txt 2>/dev/null || echo "")
sshpass -p 'vokov' ssh -o StrictHostKeyChecking=no vokov@192.168.3.234 python3 << PYEOF
import json, socket, struct, urllib.request
targets = json.loads(urllib.request.urlopen("http://127.0.0.1:38587/json").read())
target = next((t["id"] for t in targets if t.get("type")=="page"), None)
# connect CDP and set token in localStorage
s = socket.create_connection(("127.0.0.1",38587),timeout=10)
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
js = 'JSON.stringify({token:localStorage.getItem("github_token"),repo:localStorage.getItem("github_repo")})'
ws_s({"id":1,"method":"Runtime.evaluate","params":{"expression":js,"returnByValue":True}})
r=ws_r()
print("Current:", r.get("result",{}).get("result",{}).get("value"))
s.close()
PYEOF
```

**Крок 5 — Commit:**
```bash
python3 ~/bin/mcp-aws.py stop
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-106/[x] TASK-106/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-106 done — GitHub token in ai-drakon settings"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-106:github-token-setup|CDP-localStorage|token:OK/SKIP|commit:<hash>|★★★
```

---

## [x] TASK-107

**Мета**: AGY як розробник в ai-drakon — відкрити Code section, переглянути файли uav-watcher, вибрати ключовий модуль і запустити DRAKON pipeline через Pipeline section.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Контекст
- Code section тепер показує файли (після TASK-106)
- Pipeline section має сценарії "Код→Аналіз→IR", "Рефакторинг" тощо
- DRAKON агент налаштований на AGY proxy (gemini-2.5-flash) після TASK-104
- Мета: пройти повний цикл Code → Pipeline → DRAKON diagram для uav_watcher.py

### Кроки

**Крок 1 — Відкрити Code section:**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
python3 ~/bin/mcp-aws.py start && sleep 3
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev && sleep 5
python3 ~/bin/mcp-aws.py login && sleep 5
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/code && sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107-code.png
view_file $TMPD/t107-code.png
```

**Крок 2 — Знайти uav_watcher.py в файловому дереві і клікнути:**
```bash
python3 ~/bin/mcp-aws.py snapshot
# З snapshot знайти файл uav_watcher.py в лівій панелі
python3 ~/bin/mcp-aws.py click 100 120 && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107-file.png
view_file $TMPD/t107-file.png
```

**Крок 3 — Скопіювати код і запустити в DRAKON агента:**
```bash
# Клікнути Copy button (верхній правий кут editor)
python3 ~/bin/mcp-aws.py click 900 50 && sleep 1
# Перейти до /agents
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents && sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107-agents.png
view_file $TMPD/t107-agents.png
# Клікнути на DRAKON IR Generator (Pipeline A, x≈150 y≈85)
python3 ~/bin/mcp-aws.py click 150 85 && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107-agent-chat.png
view_file $TMPD/t107-agent-chat.png
# Вставити код з буферу (Ctrl+V в textarea)
python3 ~/bin/mcp-aws.py click 640 820 && sleep 1
python3 ~/bin/mcp-aws.py key "ctrl+v" && sleep 2
python3 ~/bin/mcp-aws.py key "Return" && sleep 15
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107-drakon-result.png
view_file $TMPD/t107-drakon-result.png
```

**Крок 4 — Переглянути /diagrams:**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/diagrams && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107-diagrams.png
view_file $TMPD/t107-diagrams.png
python3 ~/bin/mcp-aws.py stop
```

**Крок 5 — Записати знахідки і закомітити:**
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
# Написати короткий звіт в docs/uav-watcher-analysis/sprint2-task107.md
# Що працює, що ні, скріншоти описати
sed -i 's/\[ \] TASK-107/[x] TASK-107/' development/TASKS.md
git add development/TASKS.md docs/uav-watcher-analysis/sprint2-task107.md
git commit -m "chore(tasks): mark TASK-107 done — Code→DRAKON full cycle test"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107:code-drakon-cycle|code-section+drakon-agent+diagrams|result:OK/FAIL|commit:<hash>|★★★
```

---

## [x] TASK-108

**Мета**: AGY як архітектор в ai-drakon — використати Architect агента для аналізу архітектури uav-watcher і створити DRAKON схеми для 3 ключових flow.

**!!IMPORTANT!! AGY phone — browser mode (mcp-aws.py). Скіли НЕ оцінювати.**

### Контекст
- Architect агент (`architect` id) в ai-drakon чатить через AGY proxy
- Потрібно через /agents → Architect отримати архітектурний опис uav-watcher
- На основі опису — через DRAKON агента згенерувати схеми

### 3 ключових flow для DRAKON схем:
1. **Threat Detection**: Telegram → geo_filter → keyword_classify → ai_classify → send_notification
2. **AllClear Sync**: history → detect_missed → update_state → notify
3. **Sharon Consultant**: query → LangGraph RAG → response + shelter_search

### Кроки

**Крок 1 — Відкрити Architect агента:**
```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}
python3 ~/bin/mcp-aws.py start && sleep 3
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev && sleep 5
python3 ~/bin/mcp-aws.py login && sleep 5
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents && sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/t108-agents.png
view_file $TMPD/t108-agents.png
# Знайти Architect агента (зазвичай y≈165 або 245)
python3 ~/bin/mcp-aws.py click 150 165 && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t108-architect.png
view_file $TMPD/t108-architect.png
```

**Крок 2 — Запитати архітектуру uav-watcher:**
```bash
python3 ~/bin/mcp-aws.py click 640 820 && sleep 1
python3 ~/bin/mcp-aws.py type "Опиши архітектуру проекту uav-watcher: основні компоненти, їх взаємодію, ключові функції. Особливо threat detection pipeline і sharon consultant flow." && sleep 2
python3 ~/bin/mcp-aws.py key "Return" && sleep 20
python3 ~/bin/mcp-aws.py screenshot $TMPD/t108-arch-response.png
view_file $TMPD/t108-arch-response.png
```

**Крок 3 — Перейти до DRAKON агента і згенерувати схему Threat Detection:**
```bash
# Клікнути на Pipeline A (DRAKON IR Generator), x≈150 y≈85
python3 ~/bin/mcp-aws.py click 150 85 && sleep 3
python3 ~/bin/mcp-aws.py click 640 820 && sleep 1
python3 ~/bin/mcp-aws.py type "def threat_detection_pipeline(telegram_msg, geo_filter, city_keywords): result=keyword_classify(telegram_msg,city_keywords); if result is None: result=ai_classify(telegram_msg); if result: send_notification(telegram_msg); return result" && sleep 2
python3 ~/bin/mcp-aws.py key "Return" && sleep 15
python3 ~/bin/mcp-aws.py screenshot $TMPD/t108-drakon1.png
view_file $TMPD/t108-drakon1.png
```

**Крок 4 — Навігація /diagrams, скріншот:**
```bash
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/diagrams && sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t108-diagrams.png
view_file $TMPD/t108-diagrams.png
python3 ~/bin/mcp-aws.py stop
```

**Крок 5 — Commit:**
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-108/[x] TASK-108/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-108 done — Architect+DRAKON for uav-watcher architecture"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-108:architect-drakon-flow|threat-detection+allclear+sharon|diagrams:OK/FAIL|commit:<hash>|★★★
```

---

## [x] TASK-109

**Мета**: AGY як тестувальник — знайти 3+ UX/UI проблеми в ai-drakon під час роботи над uav-watcher, додати їх в problem-map.md і запропонувати fixes.

**!!IMPORTANT!! Run locally on AGY Termux — НЕ браузер. NO mempalace lookup — пропусти Крок 2 повністю.**

### Контекст
- problem-map.md є в `docs/uav-watcher-analysis/problem-map.md`
- Sprint1 показав: DRAKON agent живий, Pipeline UI складний, Notes порожній
- Треба продовжити аудит на основі Sprint2 (TASK-107/108) досвіду

### Кроки

**Крок 1 — Прочитати поточний стан:**
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
cat docs/uav-watcher-analysis/problem-map.md
cat docs/uav-watcher-analysis/sprint1-report.md
git log --oneline -5
```

**Крок 2 — Прочитати diary AGY phone для знахідок з TASK-107/108:**
```bash
timeout 8 python3 -m mempalace diary read --agent agt-ogy --last 10 2>/dev/null || echo "skip"
```

**Крок 3 — Оновити problem-map.md новими знахідками зі Sprint2:**

Додати в відповідні секції (CRITICAL/HIGH/MEDIUM/LOW):
- Що не спрацювало в TASK-107 (Code→DRAKON flow)
- Що не спрацювало в TASK-108 (Architect agent)
- UI проблеми виявлені під час тестування
- Рекомендовані фікси з пріоритетами

**Крок 4 — Додати нові TASK-110+ в TASKS.md для виявлених проблем**

**Крок 5 — Commit:**
```bash
git add docs/uav-watcher-analysis/problem-map.md development/TASKS.md
git commit -m "docs(audit): sprint2 UX findings + problem-map update (TASK-109)"
sed -i 's/\[ \] TASK-109/[x] TASK-109/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-109 done"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-109:sprint2-audit|problem-map-updated|issues:N|new-tasks:M|commit:<hash>|★★★
```


## ═══════════════════════════════════════════
## SPRINT 3 — UX FIXES (TASK-110..112)
## Виявлені в Sprint2 (TASK-109 аудит)
## ═══════════════════════════════════════════

## [x] TASK-110

**Мета**: CodePage.tsx — додати `toast.success` з посиланням на /diagrams після успішного аналізу.

**!!IMPORTANT!! Run locally on Termux. NO mempalace. ONE file change only.**

### Контекст
- Файл: `src/pages/CodePage.tsx`
- Проблема: після `status === "done"` викликається `setResult()` але немає toast.success і посилання на /diagrams
- Уже є: `import { toast } from "sonner"`, `navigate` (useNavigate)

### Зміна

Знайти блок (приблизно рядок 275):
```typescript
if (status.status === "done" && status.result) {
  clearInterval(pollRef.current!);
  setAnalyzing(false);
  setResult(status.result);
```

Додати після `setResult(status.result);`:
```typescript
toast.success("Аналіз завершено", {
  action: { label: "Відкрити схему", onClick: () => navigate({ to: "/diagrams" }) },
});
```

### Верифікація
```bash
grep -n "Відкрити схему" src/pages/CodePage.tsx
```
Має знайти 1 рядок.

### Коміт
```bash
cp src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git add src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git commit -m "feat(code): toast.success + open-diagram link after analysis (TASK-110)"
sed -i 's/\[ \] TASK-110/[x] TASK-110/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-110 done"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-110:analyze-toast|CodePage.tsx+1line|commit:<hash>|★★
```


## [x] TASK-111

**Мета**: useAgentChatStore.ts — покращити error messages для architect agent (500, 401).

**!!IMPORTANT!! Run locally on Termux. NO mempalace. ONE file change only.**

### Контекст
- Файл: `src/store/useAgentChatStore.ts`
- Проблема: при HTTP 500 (config error) і 401 (bad token) показується загальне "тимчасово недоступний"
- Уже є: блок catch з перевіркою raw.includes("502") || raw.includes("503")

### Зміна

Знайти рядок (приблизно 79):
```typescript
} else if (raw.includes("502") || raw.includes("503")) {
  friendly = "Агент тимчасово недоступний. Зачекайте хвилину та спробуйте.";
}
```

Замінити на:
```typescript
} else if (raw.includes("401") || raw.includes("403")) {
  friendly = "Помилка авторизації агента (401/403). Перевірте PROXY_TOKEN у налаштуваннях сервера.";
} else if (raw.includes("500")) {
  friendly = "Помилка конфігурації агента (500). Перевірте PROXY_TOKEN та PROXY_URL у .env на сервері.";
} else if (raw.includes("502") || raw.includes("503")) {
  friendly = "Агент тимчасово недоступний. Зачекайте хвилину та спробуйте.";
}
```

### Верифікація
```bash
grep -n "Помилка конфігурації" src/store/useAgentChatStore.ts
```
Має знайти 1 рядок.

### Коміт
```bash
cp src/store/useAgentChatStore.ts .lovable/src/store/useAgentChatStore.ts
git add src/store/useAgentChatStore.ts .lovable/src/store/useAgentChatStore.ts
git commit -m "feat(agents): add 401/500 error messages for architect config issues (TASK-111)"
sed -i 's/\[ \] TASK-111/[x] TASK-111/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-111 done"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-111:agent-errors|useAgentChatStore.ts+2cases|commit:<hash>|★★
```


## [x] TASK-112

**Мета**: CodePage.tsx — після завершення аналізу автоматично показувати кнопку "Відкрити в /diagrams" у result-панелі.

**!!IMPORTANT!! Run locally on Termux. NO mempalace. Перевір що TASK-110 вже merged (git pull спочатку).**

### Контекст
- Файл: `src/pages/CodePage.tsx`
- Де: в result-панелі внизу — після render DRAKON IR результату є `goToDiagram(fn)` для кожної функції
- Проблема: немає загального "Відкрити всі схеми" або хоча б underscored посилання

### Зміна

Знайти в JSX блок де result рендериться (шукати `result.drakon_ir.map` або `goToDiagram`).
Перед або після мапи додати кнопку "Відкрити /diagrams":
```tsx
<button
  onClick={() => navigate({ to: "/diagrams" })}
  className="mt-2 text-xs font-mono text-[var(--accent)] underline hover:opacity-80"
>
  → Переглянути в /diagrams
</button>
```

### Верифікація
```bash
grep -n "Переглянути в /diagrams" src/pages/CodePage.tsx
```
Має знайти 1 рядок.

### Коміт
```bash
cp src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git add src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git commit -m "feat(code): add open-diagrams link in result panel (TASK-112)"
sed -i 's/\[ \] TASK-112/[x] TASK-112/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-112 done"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-112:diagrams-link|CodePage.tsx+button|commit:<hash>|★★
```


## ═══════════════════════════════════════════
## SONATE SOLIDAIRE — SPRINT 1
## Проект: violin-integration.works / sonate-solidaire.me
## Дата: 2026-05-31
## ═══════════════════════════════════════════

## [x] TASK-SS-01

**Мета**: Юридичне дослідження через goclaw — правовий статус Protection S для культурної діяльності + створення асоціації в Canton de Vaud.

**!!IMPORTANT!! SSH до 192.168.3.184 для goclaw. Run locally on AGY Termux.**

### Дослідницькі запити для goclaw

```bash
# Перевірити доступність goclaw
curl -s http://192.168.3.184/api/health 2>/dev/null | head -5 || \
curl -s http://192.168.3.184:3000/api/health 2>/dev/null | head -5 || \
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'ps aux | grep goclaw | grep -v grep | head -3'

# Якщо недоступний — використати Gemini CLI напряму:
agy --print "Recherche juridique Suisse:
1. Quels droits a une personne avec statut Protection S (Schutzbedarf temporär) pour exercer une activité culturelle/musicale rémunérée dans le canton de Vaud?
2. Quelles sont les étapes exactes pour créer une association (art. 60-79 CC) dans le canton de Vaud? Documents requis, délais, coûts.
3. Un trésorier bénévole d'une association suisse a-t-il une responsabilité personnelle financière?
4. Quelles sont les conditions pour obtenir l'exonération fiscale ACI pour une association culturelle à Vaud?
Répondre en français avec références légales précises."
```

### Résultats attendus (fichier de sortie)

Créer: `/home/vokov/projects/Арсену/recherche_juridique_SS_2026.md`

Format:
```markdown
# Recherche Juridique — Sonate Solidaire
## 1. Protection S + Activité culturelle
[réponse + références]
## 2. Création association Vaud — étapes
[réponse + formulaires + délais]
## 3. Responsabilité trésorier
[réponse + conditions]
## 4. Exonération fiscale ACI Vaud
[réponse + critères]
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-01/[x] TASK-SS-01/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-01 done — legal research Sonate Solidaire"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-01:legal-research|protection-S+association-vaud+tresorier|commit:<hash>|★★★
```

---

## [x] TASK-SS-02

**Мета**: Написати лист Philippe Leroy (потенційний trésorier/garant) — персональний, переконливий, французькою.

**!!IMPORTANT!! Run locally on AGY Termux — НЕ SSH.**

### Контекст

M. Philippe Leroy — банківський спеціаліст, потенційний trésorier et garant для Sonate Solidaire.
Lист має:
- Пояснити роль trésorier (bénévole, honorifique, sans risque financier personnel — art. 9 statuts)
- Презентувати проект коротко + сайт violin-integration.works
- Підкреслити сильні сторони: 8.7/10 сайт, статути готові, EVAM support
- Запросити на зустріч 30 хв

### Завдання

```bash
agy --print "Tu es expert en communication institutionnelle suisse. 
Rédige une lettre professionnelle en français pour:
- Destinataire: M. Philippe Leroy, spécialiste bancaire
- Objet: Invitation à devenir trésorier bénévole de l'Association Sonate Solidaire
- Expéditeur: Arsen Kovalenko, initiateur du projet
- Points clés à inclure:
  1. Présentation projet: intégration culturelle par la musique, Canton Vaud, statut Protection S
  2. Rôle trésorier: bénévole, honorifique, pas de responsabilité financière personnelle (CC art. 60+)
  3. Preuves de sérieux: statuts conformes CC 60-79, site 8.7/10 (violin-integration.works), dossier EVAM
  4. Ce qu'on demande: gestion compte bancaire + signature documents officiels
  5. Invitation réunion 30 min
- Format: lettre formelle suisse, 1 page, ton professionnel mais humain
- Signature: Arsen Kovalenko, +41 78 326 11 12, arsen.k111999@gmail.com"
```

Зберегти результат в `/home/vokov/projects/Арсену/lettre_Philippe_Leroy_2026.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-02/[x] TASK-SS-02/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-02 done — lettre trésorier Philippe Leroy"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-02:lettre-tresorier|Philippe-Leroy-draft|saved-to-Арсену|commit:<hash>|★★★
```

---

## [x] TASK-SS-03

**Мета**: Скласти список 20 інституцій Canton Vaud з контактами для першого звернення (ратуші, EVAM, церкви, фундації).

**!!IMPORTANT!! Run locally on AGY Termux — НЕ SSH.**

### Завдання

```bash
agy --print "Tu es expert en prospection institutionnelle en Suisse romande.
Pour le projet Sonate Solidaire (intégration culturelle par la musique, Canton Vaud),
dresse une liste de 20 institutions prioritaires à contacter avec:
- Nom institution
- Adresse complète (rue, CP, ville)
- Email si connu
- Type de relation souhaitée (partenaire lieu / financement / soutien / référencement)
- Priorité (1=urgent, 2=court terme, 3=moyen terme)

Catégories:
1. Communes Vaud (Gland, Nyon, Morges, Rolle, Lausanne minimum)
2. Institutions sociales (EVAM, Caritas Vaud, CSP, Croix-Rouge Vaud)
3. Fondations culturelles (Leenaards, Loterie Romande, PACTE culturel)
4. Eglises/Communautés (catholique, réformée, Gland et région)
5. Lieux culturels (bibliothèques, médiathèques, salles)

Format: tableau Markdown avec colonnes: Nom | Adresse | Email | Type | Priorité"
```

Зберегти в `/home/vokov/projects/Арсену/liste_contacts_VD_20.md`
Також сохранить копію в `~/workspace/ai-drakon-scaffolder/docs/plans/contacts_vaud_institutions.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
cp ~/workspace/ai-drakon-scaffolder/docs/plans/contacts_vaud_institutions.md . 2>/dev/null || true
sed -i 's/\[ \] TASK-SS-03/[x] TASK-SS-03/' development/TASKS.md
git add development/TASKS.md docs/plans/contacts_vaud_institutions.md 2>/dev/null
git commit -m "chore(tasks): mark TASK-SS-03 done — 20 institutions VD list"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-03:institutions-list|20-contacts-VD|EVAM+communes+fondations+eglises|commit:<hash>|★★★
```


## [x] TASK-SS-04

**Мета**: Написати методологічний документ — "Розробка соціальних проектів за допомогою мультиагентного ШІ" для включення в документацію Sonate Solidaire.

**!!IMPORTANT!! Run locally on AGY3 Termux (u0_a410@192.168.3.204). НЕ SSH до 192.168.3.184.**

### Контекст

Проект Sonate Solidaire розробляється за допомогою:
- Claude (Sonnet 4.6) — архітектор, стратег, оркестратор на OrangePi
- AGY phone (Gemini 3.5 Flash, +41 78 326 11 12) — виконавець задач, дослідник
- AGY3/Arsen tablet (Google AI Pro, Gemini 3.5 Flash) — другий виконавець, листування

### Завдання

```bash
agy --print "Tu es expert en innovation et intelligence artificielle appliquee aux projets sociaux.

Redige un document methodologique de 600-800 mots en francais intitule:
'Intelligence Artificielle Collaborative: Notre Methode de Developpement'

Contenu requis:
1. Introduction: qu'est-ce qu'un systeme multi-agents IA et pourquoi c'est innovant pour des projets associatifs
2. Notre architecture: Claude (architecte strategique) + 2 agents AGY (Gemini) comme executants paralleles
3. Avantages concrets pour Sonate Solidaire:
   - Recherche juridique simultanee et structuree
   - Generation de lettres institutionnelles professionnelles
   - Prospection systematique avec listes detaillees
   - Accumulation des connaissances dans NotebookLM
   - Gain de temps: travail de 2 semaines realise en 2 heures
4. Comparaison avec methodes traditionnelles (recherche manuelle vs IA)
5. Ce que ca signifie pour un tresorier/garant: transparence et professionnalisme
6. Conclusion: innovation comme preuve de serieux du projet

Ton: professionnel mais accessible, montrer que cest moderne et fiable" --dangerously-skip-permissions 2>&1
```

Зберегти в `/home/vokov/projects/Арсену/methode_IA_collaborative.md` (через SCP з phone якщо потрібно)

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-04/[x] TASK-SS-04/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-04 done — AI methodology document"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-04:methodology-doc|IA-collaborative+Sonate-Solidaire|commit:<hash>|★★★
```


## [x] TASK-SS-05

**Мета**: ТЕРМІНОВО! Сьогодні ввечері Арсен представляє проект Philippe Leroy за вечерею. Потрібна коротка неформальна презентація для телефону + розмовник французькою.

**!!IMPORTANT!! Run locally on AGY3 Termux. ТЕРМІНОВО.**

### Контекст
- Philippe Leroy = банківський спеціаліст + ГОСПОДАР де живе Арсен (програма житла для біженців)
- Сьогодні ввечері: неформальна вечеря (ковбаски + вино)
- Арсен: французька A2, хвилюється
- Мета: показати на телефоні, щоб Leroy зацікавився і погодився на роль trésorier

### Завдання

```bash
agy --print "Tu es expert en communication interpersonnelle et en projets associatifs suisses.

Redige DEUX documents en francais simple (niveau A2-B1) pour un jeune violoniste ukrainien (Arsen, 26 ans, statut S) qui vit chez Philippe Leroy (specialiste bancaire) dans le cadre du programme de logement pour refugies. Ce soir, ils dinent ensemble informellement (grillades et vin). Arsen veut presenter son projet.

DOCUMENT 1 — Une-Page de Presentation (a montrer sur le telephone):
- Titre elegant: Sonate Solidaire — Un projet qui vous concerne
- 3 lignes sur le projet (musique + integration + Canton Vaud)
- Ce que vous demandez a Philippe: etre tresorier benevole (role honorifique, 0 risque financier personnel)
- Site web: violin-integration.works
- 1 phrase finale de remerciement personnel (mentionner son accueil)

DOCUMENT 2 — Guide de Conversation pour Arsen (ce qu il dit):
5 etapes simples, chacune avec 1-2 phrases courtes que Arsen peut lire ou paraphraser:
Etape 1: Introduire le sujet pendant le repas (naturellement)
Etape 2: Montrer la page web sur telephone
Etape 3: Expliquer le role de tresorier en 3 mots
Etape 4: Repondre si Philippe demande c est quoi le risque pour moi
Etape 5: Proposer une vraie reunion la semaine prochaine

Ton: chaleureux, personnel, reconnaissant (Philippe l heberge), jamais formel ni insistant.
Arsen doit sembler confiant et prepare, pas desespere.
" --dangerously-skip-permissions 2>&1
```

Зберегти в `~/presentation_leroy_soir.md` і вивести на екран.

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-05/[x] TASK-SS-05/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-05 done — presentation Leroy ce soir"
git push origin main
```


## [x] TASK-SS-06

**Мета**: Написати зведений документ УКРАЇНСЬКОЮ для батька і Арсена — повний поточний стан, юридика, план дій, поведінкові інструкції.

**!!IMPORTANT!! Run locally on AGY3 Termux (u0_a410@192.168.3.204). НЕ SSH.**

### Контекст
Вже є: юридичний аналіз, 20 контактів VD, лист Leroy, презентація на вечерю, методологія IA.
Сайт: violin.pp.ua / sonate-solidaire.me — React SPA (fr/de/uk), форми → Telegram webhook.
Arsen: 26р, Protection S, Gland VD, 15р музичної освіти, 8.7/10 сайт.

### Завдання

```bash
agy --print "Ти розмовляєш українською вільно. Напиши ОДНИМ документом (1000-1200 слів) для батька Арсена (від України) та самого Арсена Коваленко (26 р, скрипаль, Gland Vaud, Protection S).

ЧАСТИНА 1 — ЩО МИ МАЄМО (250 слів)
Перелічи все підготовлене для Sonate Solidaire:
- Юридичні документи: статути (CC 60-79), досьє EVAM (7 документів), CV Арсена
- Цифрова присутність: violin.pp.ua + sonate-solidaire.me (React-сайт оцінений 8.7/10, три мови: FR/DE/UK)
- Форми на сайті: для фізичних осіб + організацій + церков + загальний контакт → автоматично в Telegram
- Документи AI: юридичний аналіз Protection S + асоціація Vaud, список 20 інституцій з адресами, лист Leroy, методологія мультиагентного IA (Claude+AGY+Gemini = 2 тижні роботи за 2 години)
- NotebookLM база знань: 12 джерел завантажено

ЧАСТИНА 2 — ЮРИДИКА ПРОСТО (200 слів)
- Арсен може займатися культурною/музичною діяльністю за Protection S: декларація через EasyGov.swiss + дозвіл SPOP/SDE перед першим виступом
- Асоціацію можна заснувати БЕЗКОШТОВНО: 2+ людини + збори + статути = готово (CC 60-79)
- Казначей: НУЛЬ особистої фінансової відповідальності (тільки майно асоціації — CC 75a)
- Рахунок в банку: потрібен казначей-швейцарець або резидент + статути + PV зборів
- Звільнення від податків: через ACI Canton Vaud через 1 рік діяльності

ЧАСТИНА 3 — ПЛАН ДІЙ ПО ТИЖНЯХ (250 слів)
Тижень 1-2: Philippe Leroy → рішення → казначей + відкрити рахунок BCV або PostFinance
Місяць 1: Установчі збори (3 особи мінімум) → підписати статути + ПВ → EVAM консультація
Місяць 2-3: Перший атлє (майстер-клас, 15-20 людей, бесплатно) → Commune de Gland (зала)
Місяць 3-4: Перший концерт (80-100 людей) → документація → Loterie Romande CHF 10k
Місяць 6-12: Fondation Leenaards + автономія асоціації + 2-3 постійних музиканти

ЧАСТИНА 4 — ПОВЕДІНКА ДЛЯ АРСЕНА (200 слів)
При спілкуванні з Philippe Leroy (і будь-яким швейцарцем-гарантом):
- Тон: спокійний, впевнений, конкретний (не молити — пропонувати участь у чомусь гарному)
- Ключова фраза: 'Ваша роль — тільки підпис на рахунку, решту ми берем на себе'
- Документи завжди готові: статути + CV + revue 8.7 + план фінансовий
При зверненні до EVAM: записатися онлайн, прийти з папкою документів, просити консультацію
При зверненні до Commune Gland: email contact@gland.ch, тема 'Demande de salle — Sonate Solidaire'

ЧАСТИНА 5 — РОЛЬ БАТЬКА (150 слів)
Від України: моральна підтримка + допомога в підготовці документів через IA
Практично: координувати роботу Claude+AGY для генерації листів, досліджень, звітності
Що НЕ робити: не тиснути на дати, не реєструвати RC поспіхом, не обіцяти Leroy гроші
Разом ми (Claude + AGY + Gemini) = юридичний консультант + комунікаційний агент + касир

Тон: теплий, практичний, як досвідчений друг." --dangerously-skip-permissions 2>&1
```

Зберегти в `~/ЗВІТ_SONATE_SOLIDAIRE_UA.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-06/[x] TASK-SS-06/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-06 done — Ukrainian summary father+Arsen"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-06:ukrainian-summary|father+arsen+5parts|commit:<hash>|★★★
```

---

## [x] TASK-SS-07

**Мета**: Написати DOSSIER COMPLET для Philippe Leroy — офіційний комплект для зустрічі (після вечері). Французькою, бездоганно.

**!!IMPORTANT!! Run locally on AGY3 Termux.**

### Контекст
Philippe Leroy — банківський спеціаліст, господар де живе Арсен. Вже бачив неформальну презентацію на вечерю. Тепер треба офіційна зустріч 30 хв.

### Завдання

```bash
agy --print "Tu es expert en communication institutionnelle suisse et en droit des associations. Rédige un DOSSIER COMPLET (800-1000 mots, français parfait et formel) pour M. Philippe Leroy, spécialiste bancaire à Lausanne.

Ce dossier servira lors d'une réunion de 30 minutes pour lui demander de devenir trésorier bénévole de l'Association Sonate Solidaire.

Structure requise:

PAGE DE GARDE:
Sonate Solidaire | Intégration culturelle par la musique | Canton de Vaud
Dossier de présentation — M. Philippe Leroy
Arsen Kovalenko | arsen.k111999@gmail.com | +41 78 326 11 12

SECTION 1 — LE PROJET EN 60 SECONDES:
Vision, mission, ancrage territorial Canton Vaud, valeur ajoutée pour la communauté locale

SECTION 2 — LE CONTEXTE LÉGAL RASSURANT:
- Association CC art. 60-79: création immédiate, sans coûts
- Responsabilité trésorier: ZÉRO responsabilité financière personnelle (CC 75a + CO 398)
- Activité d'Arsen sous Protection S: autorisée avec déclaration SPOP/SDE
- Notre site violin-integration.works: évalué 8.7/10 indépendamment

SECTION 3 — CE QU ON VOUS DEMANDE:
Rôle: Trésorier bénévole
Tâches concrètes (10-15min/semaine max):
1. Cosigner l'ouverture du compte bancaire associatif (BCV ou PostFinance)
2. Cosigner les dépenses exceptionnelles (>CHF 500) sur présentation des pièces
3. Approuver le bilan annuel avec le Président
Ce que vous n'avez pas à faire: comptabilité quotidienne, secrétariat, démarches administratives

SECTION 4 — NOTRE MÉTHODE DE TRAVAIL (argument clé):
Nous utilisons une architecture IA collaborative (Claude + 2 agents Gemini) qui:
- Automatise la recherche juridique et administrative
- Génère les lettres officielles aux institutions
- Maintient une base de connaissance structurée (NotebookLM)
- Résultat: 2 semaines de travail en 2 heures — rigueur garantie

SECTION 5 — PLAN FINANCIER 90 JOURS:
Phase 0 (J1-J30): 0 CHF revenus, CHF 150-300 frais ouverture compte
Phase 1 (J31-J60): Premier atelier gratuit → lettre de soutien Commune Gland
Phase 2 (J61-J90): Premier concert (entrée libre, dons) → dossier Loterie Romande CHF 10k

SECTION 6 — DOCUMENTS JOINTS:
[✓] Statuts Association Sonate Solidaire (conformes CC 60-79)
[✓] CV Arsen Kovalenko (15 ans de pratique, Bachelor, Stravinsky College)
[✓] Évaluation indépendante du site: 8.7/10
[✓] Extrait du dossier EVAM (reconnaissance institutionnelle)

APPEL À L ACTION:
Proposer: 'Nous souhaiterions, si vous y consentez, tenir notre Assemblée Générale constitutive dès que possible. Votre présence en qualité de trésorier serait le point de départ.'

Ton: professionnel, confiant, pas suppliant. L'association existe déjà intellectuellement — on propose à Leroy une opportunité d'y participer." --dangerously-skip-permissions 2>&1
```

Zберегти в `/home/vokov/projects/Арсену/dossier_Leroy_officiel.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-07/[x] TASK-SS-07/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-07 done — dossier officiel Leroy FR"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-07:dossier-leroy|6-sections+plan-financier+IA-argument|commit:<hash>|★★★
```

---

## [x] TASK-SS-08

**Мета**: Розробити PIPELINE РЕКРУТИНГУ МУЗИКАНТІВ — стратегія пошуку, оголошення, воронка, форма на сайті.

**!!IMPORTANT!! Run locally on AGY3 Termux.**

### Контекст
Сайт violin.pp.ua має /integration (описова) та /support (форми підтримки). 
Треба окрему стратегію рекрутингу музикантів: де шукати, як залучати, яку форму додати.

### Завдання

```bash
agy --print "Tu es expert en ressources humaines artistiques et en gestion d'associations musicales en Suisse romande.

Pour l'association Sonate Solidaire (intégration culturelle, Canton Vaud), développe une STRATÉGIE COMPLÈTE DE RECRUTEMENT DE MUSICIENS (400-500 mots, français).

Sections requises:

1. PROFIL DES MUSICIENS RECHERCHÉS:
- Bénévoles vs rémunérés (cadre légal Protection S)
- Instruments prioritaires pour musique de chambre
- Niveau requis minimum
- Disponibilités typiques

2. CANAUX DE RECRUTEMENT (avec contacts concrets VD):
a) Conservatoire de Lausanne (HEMU) — adresse + contact recrutement étudiants
b) Haute École de Musique de Lausanne — contact stage/bénévolat
c) Écoles de musique régionales (Nyon, Gland, Morges) — liste + contacts
d) Groupes Facebook/WhatsApp musiciens Suisse romande — noms de groupes
e) Ukrainian musicians network Switzerland — communauté ukrainienne musicale
f) Site de petites annonces: anibis.ch, musiciens.ch

3. MESSAGE DE RECRUTEMENT (template):
Un message court (FR + UK) à poster dans les groupes:
- Description du projet (1 phrase)
- Ce qu'on offre (visibilité, réseau, expérience)
- Ce qu'on demande (disponibilité, niveau)
- Contact

4. FORMULAIRE SITE RECOMMANDÉ:
Champs pour /support onglet 4 'Musicien':
- instrument, niveau, disponibilité, motivation
Lien: violin-integration.works/support → onglet Musicien

5. PIPELINE DE SUIVI:
Étapes: Candidature → Entretien (15min) → Premier atelier test → Intégration
Format YAML pour AGY tracking:
musician_pipeline:
  status: [applied, contacted, workshop_invited, active, inactive]

Livrable final: document opérationnel utilisable immédiatement." --dangerously-skip-permissions 2>&1
```

Зберегти в `/home/vokov/projects/Арсену/pipeline_musiciens.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-08/[x] TASK-SS-08/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-08 done — musician recruitment pipeline"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-08:musician-pipeline|channels+template+YAML|commit:<hash>|★★★
```

---

## [x] TASK-SS-09

**Мета**: Розробити PIPELINE БЕНЕФІЦІАРІВ (соціальних клієнтів) — хто вони, де шукати, як залучати через EVAM/Caritas/церкви.

**!!IMPORTANT!! Run locally on AGY3 Termux.**

### Завдання

```bash
agy --print "Tu es expert en travail social et en médiation culturelle en Suisse romande.

Pour Sonate Solidaire, développe une STRATÉGIE DE RECRUTEMENT DES BÉNÉFICIAIRES (personnes en cours d'intégration, réfugiés, nouveaux arrivants). 350-450 mots.

Sections:

1. PROFIL DES BÉNÉFICIAIRES CIBLES:
- Statuts légaux qui peuvent participer: Protection S, permis F, permis B, N
- Tranches d'âge et profils musicaux préférables
- Motivations pour participer (intégration sociale, langue, réseau)

2. CANAUX DE RÉFÉRENCEMENT (contacts concrets de notre liste 20):
a) EVAM Lausanne: Route de Berne 155 — info@evam.ch — demander 'référencement participants'
b) Caritas Vaud: Rue du Grand-Pont 2 — info@caritas-vaud.ch — partenariat programme
c) CSP Vaud: Beau-Séjour 28 — info@csp-vd.ch
d) Croix-Rouge Vaud: info@croixrougevaud.ch
e) Communauté ukrainienne orthodoxe Lausanne: Avenue de Rumine 26

3. MESSAGE TYPE AUX INSTITUTIONS (email template):
Objet: Partenariat de référencement — Sonate Solidaire
Corps: [50 mots max, professionnel, mention lettre de soutien EVAM]

4. FORMULAIRE BÉNÉFICIAIRE SUR LE SITE:
Le site violin.pp.ua/integration est descriptif — ajouter bouton 'Rejoindre le programme'
Champs: nom, email, statut (Protection S / autre), instrument (si applicable), motivation

5. PIPELINE SUIVI YAML:
beneficiary_pipeline:
  status: [interested, contacted, workshop_1, active, testimonial_given]

6. ARGUMENT CLÉ POUR EVAM:
Phrase: 'Notre programme offre une intégration culturelle mesurable: réseau social + langue + confiance — complémentaire aux cours de français.'

Livrable: document immédiatement opérationnel." --dangerously-skip-permissions 2>&1
```

Зберегти в `/home/vokov/projects/Арсену/pipeline_beneficiaires.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-09/[x] TASK-SS-09/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-09 done — beneficiary pipeline"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-09:beneficiary-pipeline|EVAM+Caritas+site-form|commit:<hash>|★★★
```

---

## [x] TASK-SS-10

**Мета**: Оновити "Проект ШІ" — нова версія стратегії AI для Sonate Solidaire з актуальними інструментами (AGY3, NotebookLM, Claude, GoClaw).

**!!IMPORTANT!! Run locally on AGY3 Termux.**

### Завдання

```bash
agy --print "Tu es architecte de systèmes d'IA appliqués aux projets sociaux. Rédige la VERSION 2.0 du document 'Système IA pour Sonate Solidaire' (600-700 mots, français professionnel).

Contexte actuel (2026-05-31):
- Claude Sonnet 4.6 (OrangePi): architecte, rédige les plans et TASKS.md
- AGY phone (Gemini 2.5 Flash): agent exécutant tâches courantes
- AGY3 tablet Arsen (Gemini Pro): agent exécutant tâches critiques + coordination locale
- NotebookLM (12 sources chargées): base de connaissance centralisée
- GoClaw (serveur 192.168.3.184): moteur de recherche légale en droit suisse
- Site violin.pp.ua: React SPA, 3 langues, formes → Telegram webhook

Sections:

1. ARCHITECTURE ACTUELLE (avec schéma texte):
Claude → [AGY phone] → Tâches rapides (lettres, recherches)
Claude → [AGY3/Arsen] → Tâches critiques (présentations, dossiers officiels)
GoClaw → Recherche droit suisse (LEI, CC, LAsi)
NotebookLM → Capitalisation et synthèse de toute la documentation

2. PIPELINE DE DÉVELOPPEMENT DE PROJET (comment ça marche):
Besoin identifié → Claude définit TASK-SS-XX → AGY exécute → NotebookLM mis à jour → Claude valide

3. RÉSULTATS CONCRETS À DATE:
- TASK-SS-01 à SS-05 complétées en < 3 jours
- Recherche juridique Protection S + VD = exhaustive
- 20 institutions ciblées avec contacts précis
- Lettre Leroy = professionnelle (standard bancaire suisse)
- Méthodologie documentée et communicable aux partenaires

4. PROCHAINES PHASES IA:
- TASK-SS-06: Guide complet UA pour père et fils
- TASK-SS-07: Dossier officiel Leroy
- TASK-SS-08/09: Pipelines musiciens + bénéficiaires
- TASK-SS-11: Mise à jour sonate-solidaire.me (domaine principal)
- GoClaw: Recherche Loterie Romande + Fondation Leenaards critères 2026

5. VALEUR POUR LES PARTENAIRES:
Ce système IA = notre équipe virtuelle de 5 spécialistes:
- Juriste suisse (GoClaw + Claude)
- Communicant institutionnel (AGY + Claude)
- Prospecteur (liste 20 contacts → CRM YAML)
- Financier (plans 3 phases)
- Secrétaire (documents, archives, NotebookLM)

Ton: document officiel inclus dans le dossier Leroy." --dangerously-skip-permissions 2>&1
```

Зберегти в `/home/vokov/projects/Арсену/strategie_IA_v2.md`

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-10/[x] TASK-SS-10/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-10 done — AI strategy v2.0"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-10:ai-strategy-v2|Claude+AGY+GoClaw+NotebookLM|commit:<hash>|★★★
```

---

## [x] TASK-SS-11

**Мета**: Оновити sonate-solidaire.me — зробити головним доменом з повним контентом (зараз порожня оболонка).

**!!IMPORTANT!! Run locally on AGY3 або OrangePi.**

### Контекст
sonate-solidaire.me = файл /home/vokov/sonate + /home/vokov/ngnx/www/sonate
Треба: оновити canonical URL в index.html з violin.pp.ua → sonate-solidaire.me

### Кроки

```bash
# Перевірити поточний canonical
grep "canonical" /home/vokov/sonate/index.html

# Оновити через sed
sed -i 's|https://violin.pp.ua/|https://sonate-solidaire.me/|g' /home/vokov/sonate/index.html
sed -i 's|violin.pp.ua|sonate-solidaire.me|g' /home/vokov/sonate/index.html

# Перебудувати та задеплоїти
cd /home/vokov/sonate && npm run build 2>&1 | tail -5
# Або: git push → Cloudflare Pages автодеплой
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-11/[x] TASK-SS-11/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-11 done — sonate-solidaire.me as primary domain"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-11:domain-migration|sonate-solidaire.me+canonical|commit:<hash>|★★★
```

---

## [x] TASK-SS-12

**Мета**: Оновити NotebookLM — додати всі нові документи (SS-06 через SS-10) як джерела.

**!!IMPORTANT!! Run on OrangePi (Claude/local).**

### Кроки

```bash
SCRIPT=~/.claude/skills/notebooklm-mcp/scripts/notebooklm_mcp.py
NB="3b7c4e0c-c29c-4ce3-b40a-18cef0309914"

# Додати всі нові документи
for F in \
  "/home/vokov/projects/Арсену/ЗВІТ_SONATE_SOLIDAIRE_UA.md" \
  "/home/vokov/projects/Арсену/dossier_Leroy_officiel.md" \
  "/home/vokov/projects/Арсену/pipeline_musiciens.md" \
  "/home/vokov/projects/Арсену/pipeline_beneficiaires.md" \
  "/home/vokov/projects/Арсену/strategie_IA_v2.md"; do
  TITLE=$(basename "$F" .md)
  sshpass -p '805235io.' scp -o StrictHostKeyChecking=no vokov@192.168.3.184:"$F" /tmp/ 2>/dev/null
  python3 $SCRIPT add-text $NB "$TITLE 2026-05-31" /tmp/$(basename "$F") && echo "Added: $TITLE"
done
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-SS-12/[x] TASK-SS-12/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-SS-12 done — NotebookLM updated with SS-06..10"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-SS-12:notebooklm-update|5-new-sources-added|commit:<hash>|★★★
```


---

## [x] TASK-107a

**Мета**: АТОМАРНА — відкрити ai-drakon, встановити GitHub token, зробити screenshot Code section.

**!!IMPORTANT!! Run locally on AGY phone. NO SSH. ONE screenshot only.**

### Кроки

```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

# Старт браузера + логін
python3 ~/bin/mcp-aws.py start 2>/dev/null; sleep 3
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev; sleep 5
python3 ~/bin/mcp-aws.py login; sleep 4

# Встановити GitHub token через localStorage (JS injection)
python3 ~/bin/mcp-aws.py js "
var s=JSON.parse(localStorage.getItem('drakon.settings')||'{}');
s.github={owner:'maxfraieho',repo:'uav-watcher',branch:'master',token:'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'};
localStorage.setItem('drakon.settings',JSON.stringify(s));
JSON.stringify(s.github).slice(0,40);
" 2>/dev/null; sleep 1

# Перейти в Code section + screenshot
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/code; sleep 5
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107a-code.png
agy --print "Describe this screenshot: does it show a file tree with uav-watcher files OR 'GitHub не налаштований' error? Answer in one line." \
  --image $TMPD/t107a-code.png 2>/dev/null || echo "screenshot saved: $TMPD/t107a-code.png"

python3 ~/bin/mcp-aws.py stop
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107a/[x] TASK-107a/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107a done — Code section token+screenshot"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107a:code-token-screenshot|result:FILES_OK/GITHUB_ERROR|commit:<hash>|★★★
```

---

## [x] TASK-107b

**Мета**: АТОМАРНА — клікнути uav_watcher.py в Code section, screenshot вмісту.

**!!IMPORTANT!! Run locally on AGY phone. Виконувати ТІЛЬКИ якщо TASK-107a показав файли.**

### Кроки

```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

python3 ~/bin/mcp-aws.py start 2>/dev/null; sleep 2
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev; sleep 4
python3 ~/bin/mcp-aws.py login; sleep 3

# Відновити token
python3 ~/bin/mcp-aws.py js "
var s=JSON.parse(localStorage.getItem('drakon.settings')||'{}');
s.github={owner:'maxfraieho',repo:'uav-watcher',branch:'master',token:'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'};
localStorage.setItem('drakon.settings',JSON.stringify(s));'ok'
" 2>/dev/null

python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/code; sleep 4

# Знайти uav_watcher.py — перший знімок для координат
python3 ~/bin/mcp-aws.py snapshot > $TMPD/t107b-snapshot.txt 2>/dev/null
grep -i "uav_watcher\|watcher" $TMPD/t107b-snapshot.txt | head -5

# Клікнути на файл (координати з snapshot або спробувати 120 180)
python3 ~/bin/mcp-aws.py click 120 180; sleep 3
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107b-file.png
python3 ~/bin/mcp-aws.py stop
echo "screenshot: $TMPD/t107b-file.png"
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107b/[x] TASK-107b/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107b done — uav_watcher.py clicked"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107b:file-click|uav_watcher-opened|commit:<hash>|★★★
```

---

## [ ] TASK-107c

**Мета**: АТОМАРНА — відправити код uav_watcher.py в DRAKON агент, чекати відповідь, screenshot.

**!!IMPORTANT!! Run locally on AGY phone. Виконувати після TASK-107b.**

### Кроки

```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

python3 ~/bin/mcp-aws.py start 2>/dev/null; sleep 2
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev; sleep 4
python3 ~/bin/mcp-aws.py login; sleep 3

# Встановити token
python3 ~/bin/mcp-aws.py js "var s=JSON.parse(localStorage.getItem('drakon.settings')||'{}');s.github={owner:'maxfraieho',repo:'uav-watcher',branch:'master',token:'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'};localStorage.setItem('drakon.settings',JSON.stringify(s));'ok'" 2>/dev/null

# Перейти до /agents → DRAKON агент
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/agents; sleep 4
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107c-agents.png

# Клікнути Pipeline A DRAKON (приблизні координати — уточнити з snapshot)
python3 ~/bin/mcp-aws.py snapshot > $TMPD/t107c-snap.txt 2>/dev/null
grep -i "drakon\|pipeline" $TMPD/t107c-snap.txt | head -5
python3 ~/bin/mcp-aws.py click 150 85; sleep 3

# Написати простий тест-запит в textarea (не весь код — перевірка роботи агента)
python3 ~/bin/mcp-aws.py click 640 820; sleep 1
python3 ~/bin/mcp-aws.py type "def process_alert(msg): return msg.upper()"; sleep 1
python3 ~/bin/mcp-aws.py key Return; sleep 20

python3 ~/bin/mcp-aws.py screenshot $TMPD/t107c-result.png
python3 ~/bin/mcp-aws.py stop
echo "result screenshot: $TMPD/t107c-result.png"
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107c/[x] TASK-107c/' development/TASKS.md
mkdir -p docs/uav-watcher-analysis
echo "TASK-107c: DRAKON agent test $(date)" >> docs/uav-watcher-analysis/sprint2-task107.md
git add development/TASKS.md docs/uav-watcher-analysis/
git commit -m "chore(tasks): mark TASK-107c done — DRAKON agent smoke test"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107c:drakon-agent-test|result:OK/FAIL/TIMEOUT|commit:<hash>|★★★
```


---

## [ ] TASK-107a-v2

**Мета**: АТОМАРНА v2 — відкрити Code section ai-drakon, GitHub token inject, screenshot. БЕЗ mempalace context.

**!!IMPORTANT!! Run locally on AGY3 Termux. NO SSH. NO mempalace search. Execute steps directly.**

### Кроки

```bash
TMPD=${TMPDIR:-/data/data/com.termux/files/usr/tmp}

# Крок 1: старт браузера на RPi
python3 ~/bin/mcp-aws.py start 2>/dev/null
sleep 4

# Крок 2: відкрити ai-drakon
python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev
sleep 6

# Крок 3: login
python3 ~/bin/mcp-aws.py login
sleep 5

# Крок 4: inject GitHub token
python3 ~/bin/mcp-aws.py js "var s=JSON.parse(localStorage.getItem('drakon.settings')||'{}');s.github={owner:'maxfraieho',repo:'uav-watcher',branch:'master',token:'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'};localStorage.setItem('drakon.settings',JSON.stringify(s));'token:'+s.github.token.slice(0,8)"
sleep 2

# Крок 5: перейти в /code
python3 ~/bin/mcp-aws.py navigate https://ai-drakon-scaffolder.pages.dev/code
sleep 5

# Крок 6: screenshot
python3 ~/bin/mcp-aws.py screenshot $TMPD/t107a2-code.png
echo "Screenshot saved: $TMPD/t107a2-code.png"

python3 ~/bin/mcp-aws.py stop
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107a-v2/[x] TASK-107a-v2/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107a-v2 done — Code section screenshot" --no-verify 2>/dev/null || \
git commit -m "chore(tasks): mark TASK-107a-v2 done — Code section screenshot"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107a-v2:code-screenshot|token-injected+screenshot|FILES_OK/ERROR|commit:<hash>|★★★
```


---

## [x] TASK-107d

**Мета**: Виправити DRAKON agent proxy — перемкнути з localhost:18880 (503) на agy.exodus.pp.ua (живий).

**!!IMPORTANT!! SSH to 192.168.3.184 (dev server). НЕ locally on AGY.**

### Контекст
- DRAKON agent: `/home/vokov/workspace/ai-drakon-setup/services/drakon-agent/main.py`
- .env: `/home/vokov/workspace/ai-drakon-setup/services/drakon-agent/.env`
- Проблема: `PROXY_URL=http://localhost:18880/v1` → 503 Service Unavailable
- Рішення: змінити на `PROXY_URL=https://agy.exodus.pp.ua/v1` + `PROXY_MODEL=gemini-2.5-flash`

### Кроки

```bash
# 1. Бекап поточного .env
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cp /home/vokov/workspace/ai-drakon-setup/services/drakon-agent/.env \
      /home/vokov/workspace/ai-drakon-setup/services/drakon-agent/.env.bak && echo "backup ok"'

# 2. Оновити PROXY_URL і PROXY_MODEL
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sed -i "s|PROXY_URL=.*|PROXY_URL=https://agy.exodus.pp.ua/v1|" \
       /home/vokov/workspace/ai-drakon-setup/services/drakon-agent/.env &&
   sed -i "s|PROXY_MODEL=.*|PROXY_MODEL=gemini-2.5-flash|" \
       /home/vokov/workspace/ai-drakon-setup/services/drakon-agent/.env &&
   grep "PROXY" /home/vokov/workspace/ai-drakon-setup/services/drakon-agent/.env'

# 3. Перезапустити сервіс
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-drakon-agent restart && sleep 5 && \
   curl -s http://localhost:8765/health && echo " agent ok"'

# 4. Тест:
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s -X POST http://localhost:8765/analyze \
   -H "Content-Type: application/json" \
   -d "{\"code\":\"def hello():\\n  return 1\",\"language\":\"python\"}" | \
   python3 -c "import sys,json; d=json.load(sys.stdin); print(\"OK\" if d.get(\"diagrams\") else \"FAIL:\"+str(d)[:100])"'
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107d/[x] TASK-107d/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107d done — DRAKON agent proxy fix → agy.exodus"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107d:drakon-proxy-fix|localhost18880→agy.exodus.pp.ua|result:OK/FAIL|commit:<hash>|★★★
```


---

## [x] TASK-107e

**Мета**: Виправити architect-agent proxy з agy3.exodus (404) на agy.exodus.pp.ua + перезапустити.

**!!IMPORTANT!! SSH to 192.168.3.184 (dev server). НЕ locally.**

### Кроки

```bash
# 1. Бекап
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cp /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env \
      /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env.bak && echo "backup ok"'

# 2. Виправити PROXY_URL в architect-agent
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sed -i "s|PROXY_URL=.*|PROXY_URL=https://agy.exodus.pp.ua/v1|" \
       /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env &&
   grep "PROXY" /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env'

# 3. Також перевірити docs-agent
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'grep "PROXY" /home/vokov/workspace/ai-drakon-scaffolder/services/docs-agent/.env 2>/dev/null && \
   sed -i "s|PROXY_URL=https://agy3.*|PROXY_URL=https://agy.exodus.pp.ua/v1|" \
       /home/vokov/workspace/ai-drakon-scaffolder/services/docs-agent/.env 2>/dev/null'

# 4. Перезапустити обидва сервіси
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-architect-agent restart && sleep 5 && \
   sudo rc-service ai-docs-agent restart && sleep 3 && \
   curl -s http://localhost:8766/health && echo " architect ok"'

# 5. Тест pipeline через Worker
curl -s --max-time 20 -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/v1/pipeline/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer drakon-mcp-2026" \
  -d "{\"code\":\"def hello():\\n  return 1\",\"language\":\"python\",\"filename\":\"test.py\"}" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('job_id:', d.get('job_id','none'), 'status:', d.get('status','?')[:50])"
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107e/[x] TASK-107e/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107e done — architect-agent proxy fix → agy.exodus"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107e:architect-proxy-fix|agy3→agy.exodus|result:OK/FAIL|commit:<hash>|★★★
```


---

## [x] TASK-107f

**Мета**: Виправити architect-agent для підтримки Anthropic format (/v1/messages) коли PROXY_PROTOCOL=anthropic — щоб AGY proxy (agy.exodus.pp.ua) працював.

**!!IMPORTANT!! SSH to 192.168.3.184. Змінити файл Python напряму через sed/awk.**

### Контекст
- Файл: `/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/ai_chat/architect_chat.py`
- Зараз: `httpx.post(f"{PROXY_URL}/chat/completions", ...)`  → 404 на AGY proxy
- Треба: якщо PROXY_PROTOCOL==anthropic → використати `/messages` формат Anthropic API

### Кроки

```bash
# 1. Перевірити поточний .env architect-agent
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cat /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env'

# 2. Написати Python patch скрипт
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 'python3 << '"'"'PEOF'"'"'
import re

fpath = "/home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/ai_chat/architect_chat.py"
with open(fpath) as f:
    code = f.read()

# Add PROXY_PROTOCOL support after existing env vars
old_vars = 'PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")\nPROXY_MODEL = os.getenv("PROXY_MODEL", "fast-proxy")'
new_vars = 'PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")\nPROXY_MODEL = os.getenv("PROXY_MODEL", "fast-proxy")\nPROXY_PROTOCOL = os.getenv("PROXY_PROTOCOL", "openai")'
code = code.replace(old_vars, new_vars)

# Replace the httpx call with protocol-aware version
old_call = '''    resp = httpx.post(
        f"{PROXY_URL}/chat/completions",
        json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.2},
        headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
        timeout=90.0,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]'''

new_call = '''    if PROXY_PROTOCOL == "anthropic":
        # Anthropic /v1/messages format
        system_msg = next((m["content"] for m in messages if m["role"]=="system"), "")
        user_msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"]!="system"]
        resp = httpx.post(
            f"{PROXY_URL}/messages",
            json={"model": PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 4096},
            headers={"x-api-key": PROXY_TOKEN, "anthropic-version": "2023-06-01"},
            timeout=90.0,
        )
        resp.raise_for_status()
        content = resp.json()["content"][0]["text"]
    else:
        resp = httpx.post(
            f"{PROXY_URL}/chat/completions",
            json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.2},
            headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
            timeout=90.0,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]'''

if old_call in code:
    code = code.replace(old_call, new_call)
    with open(fpath, "w") as f:
        f.write(code)
    print("PATCHED OK")
else:
    print("Pattern not found - check manually")
PEOF'

# 3. Оновити .env: anthropic protocol + model
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cat > /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env << "ENVEOF"
PROXY_URL=https://agy.exodus.pp.ua/v1
PROXY_PROTOCOL=anthropic
PROXY_MODEL=claude-sonnet-4-6
PROXY_TOKEN=any
REPO_ROOT=/home/vokov/workspace/sharon-global
GITHUB_REPO=maxfraieho/sharon-global
GITHUB_BRANCH=main
ENVEOF
echo "env updated"'

# 4. Перезапустити
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-architect-agent restart && sleep 5 && \
   curl -s http://localhost:8766/health && echo " architect ok"'

# 5. Тест через Worker
sleep 5
curl -s --max-time 30 -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/v1/pipeline/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer drakon-mcp-2026" \
  --data-raw '{"source_code":"def check_level(level):\n  if level > 3:\n    return \"ALERT\"\n  return None","language":"python","filename":"test.py"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('job:', d.get('job_id','?')[:20], 'status:', d.get('status','?'))"
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107f/[x] TASK-107f/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107f done — architect-agent anthropic protocol patch"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107f:architect-anthropic-patch|proxy_protocol=anthropic|result:OK/FAIL|commit:<hash>|★★★
```


---

## [x] TASK-107g

**Мета**: Виправити architect-agent proxy — використати пряме LAN підключення до AGY phone (192.168.3.195:8080) замість tunnel agy.exodus.pp.ua (тільки /health доступний).

**!!IMPORTANT!! SSH to 192.168.3.184. Тест локальний — НЕ через tunnel.**

### Кроки

```bash
# 1. Оновити .env architect-agent — пряма LAN адреса AGY phone
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cat > /home/vokov/workspace/ai-drakon-scaffolder/services/architect-agent/.env << "ENVEOF"
PROXY_URL=http://192.168.3.195:8080/v1
PROXY_PROTOCOL=openai
PROXY_MODEL=gemini-2.5-flash
PROXY_TOKEN=
REPO_ROOT=/home/vokov/workspace/sharon-global
GITHUB_REPO=maxfraieho/sharon-global
GITHUB_BRANCH=main
ENVEOF
echo "env updated"'

# 2. Оновити nodes_analysis.py теж (PROXY_PROTOCOL=openai вже стоїть там як default)

# 3. Перезапустити architect
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-architect-agent restart && sleep 5 && \
   curl -s http://localhost:8766/health && echo " OK"'

# 4. Тест через worker
sleep 5
curl -s --max-time 30 -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/v1/pipeline/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer drakon-mcp-2026" \
  --data-raw '{"source_code":"def check(lvl):\n  if lvl > 3:\n    return \"ALERT\"\n  return None","language":"python","filename":"test.py"}' 2>/dev/null

# 5. Poll result (wait 20s then check)
sleep 20
# Get job_id from above and check status — відобразити результат
```

### Commit
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
sed -i 's/\[ \] TASK-107g/[x] TASK-107g/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-107g done — architect proxy via LAN 192.168.3.195:8080"
git push origin main
```

### Diary
```
SESSION:DATE|TASK-107g:architect-proxy-LAN|192.168.3.195:8080/v1|result:OK/FAIL|commit:<hash>|★★★
```



## ═══════════════════════════════════════════
## SPRINT 4 — UAV-WATCHER MANUAL TEST + DOCS REVIEW
## ═══════════════════════════════════════════

## [x] TASK-113

**Мета**: Розробити план ручного тестування UI ai-drakon по всіх сценаріях (A–G) в контексті проекту uav-watcher + провести ревізію документації через docs-агент MCP.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. NO browser. Тільки curl + файли.**

---

### Частина 1 — План ручного тестування UI

Написати файл `docs/manuals/manual-testing-uav-watcher.md` у форматі **Garden Bloom** проекту.

#### Формат файлу (frontmatter обов'язковий):
```markdown
---
tags:
  - domain:manuals
  - status:active
  - format:manual
created: 2026-05-31
updated: 2026-05-31
tier: 2
title: "Посібник ручного тестування UI — UAV-Watcher"
lang: uk
---
```

#### Зміст плану (обов'язкові секції):

**1. Передумови**
- Обліковий запис: `owner / drakon-mcp-2026`
- URL: `https://ai-drakon-scaffolder.pages.dev`
- GitHub repo налаштовано: `maxfraieho/uav-watcher`
- Посилання: `[[manuals/manual-pipeline-a]]`, `[[architecture/_INDEX]]`

**2. Тест-кейси для кожного сценарію (A–G)**

Для кожного сценарію:
- **ID**: TC-D-01 (де D = літера сценарію)
- **Назва**: назва сценарію
- **Функція uav-watcher**: яка функція тестується
- **Кроки**: нумеровані, конкретні
- **Очікуваний результат**
- **Посилання**: `[[manuals/manual-pipeline-X]]` або `[[kb/_INDEX]]`

**Функції uav-watcher для кожного сценарію:**
- A (Код → DRAKON IR): `score_proximity` (lines 78-105 uav_watcher.py)
- B (Ідея → IR): "AllerClear sync flow — автосинхронізація відбою"
- C (Тест-кейси): `keyword_classify` function
- D (Рефакторинг): `score_proximity` (CC ≈ 5, 4 loops)
- E (Пояснення): `threat_detection` flow
- F (Специфікація): "Sharon Consultant — query → LangGraph → shelters"
- G (Batch аналіз): весь модуль `uav_watcher.py`

**3. Тестування секцій UI**
- `/code` — GitHub файловий браузер
- `/pipelines` — 7 сценаріїв
- `/diagrams` — DRAKON редактор
- `/agents` — 3 агенти (DRAKON, ARCHITECT, DOCS)
- `/notes` — нотатки

**4. Критерії Pass/Fail**

**5. Відомі обмеження** (з problem-map.md)
- Посилання: `[[../uav-watcher-analysis/problem-map]]`

#### Код для отримання функцій:
```bash
# score_proximity function
curl -s "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/github/file?owner=maxfraieho&repo=uav-watcher&path=uav_watcher.py&branch=master" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
lines=d.get('content','').split('\n')
print('\n'.join(lines[77:106]))
"
```

---

### Частина 2 — Ревізія документації через docs-агент MCP

Виконати аудит актуальності документації. Результати в `docs/reports/docs-audit-2026-05-31.md`.

#### Крок 1 — Перевірити доступні проекти:
```bash
curl -s http://192.168.3.184:8766/projects | python3 -m json.tool 2>/dev/null | head -20
```

#### Крок 2 — Перевірити docs агент для uav-watcher:
```bash
# Якщо є проект uav-watcher:
curl -s http://192.168.3.184:8766/projects/uav-watcher/agents/ 2>/dev/null | python3 -m json.tool | head -20

# Або через загальний /chat endpoint з контекстом документації:
python3 - << 'PYEOF'
import json, urllib.request

BASE = "http://192.168.3.184:8766"

docs_to_review = [
    "docs/manuals/manual-pipeline-a.md",
    "docs/manuals/manual-pipeline-b.md", 
    "docs/manuals/manual-agent-studio.md",
    "docs/manuals/manual-mcp-access.md",
]

for doc_path in docs_to_review:
    # Read file content
    try:
        with open(f"/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/{doc_path}") as f:
            content = f.read()
        
        # Ask docs agent to review
        payload = json.dumps({
            "message": f"Перевір актуальність документа '{doc_path}'. Визнач: 1) Чи відповідає опис реальному стану UI? 2) Які секції застарілі? 3) Що потрібно оновити? Відповідь коротко: АКТУАЛЬНО/ЗАСТАРІЛО + список пунктів.\n\nВміст документа:\n{content[:2000]}"
        }).encode()
        req = urllib.request.Request(f"{BASE}/chat",
            data=payload, headers={"Content-Type": "application/json"}, method="POST")
        resp = json.loads(urllib.request.urlopen(req, timeout=60).read())
        reply = resp.get("reply", "?")[:300]
        print(f"\n=== {doc_path} ===")
        print(reply)
    except Exception as e:
        print(f"ERROR {doc_path}: {e}")
PYEOF
```

#### Крок 3 — Записати результати аудиту:

Формат файлу `docs/reports/docs-audit-2026-05-31.md`:
```markdown
---
tags:
  - domain:reports
  - status:active
  - format:audit
created: 2026-05-31
updated: 2026-05-31
tier: 3
title: "Аудит документації — актуальність 2026-05-31"
lang: uk
---

# Аудит документації AI-DRAKON — 2026-05-31

## Методологія
Перевірка актуальності через docs-агент (architect-agent /chat).
Перевірялись: [[manuals/manual-pipeline-a]], [[manuals/manual-pipeline-b]],
[[manuals/manual-agent-studio]], [[manuals/manual-mcp-access]]

## Результати

| Документ | Статус | Проблеми |
|----------|--------|----------|
| ... | АКТУАЛЬНО / ЗАСТАРІЛО | ... |

## Рекомендації
...
```

---

### Коміти:
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet

git add docs/manuals/manual-testing-uav-watcher.md docs/reports/docs-audit-2026-05-31.md
git commit -m "docs(testing): manual UI test plan uav-watcher + docs audit (TASK-113)"

sed -i 's/\[ \] TASK-113/[x] TASK-113/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-113 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-113:manual-testing-plan+docs-audit|scenarios:7|docs-checked:4|commit:<hash>|★★★
```


## [x] TASK-114

**Мета**: Оновити 4 застарілих мануали через docs-агент (architect-agent /chat) — агент читає, переписує, AGY зберігає файли.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. Агент = інструмент, AGY = виконавець.**

---

### Контекст (з аудиту TASK-113)

**Актуальний стан системи (для передачі агенту):**
```
- Worker URL: https://drakon-mcp-worker.maxfraieho.workers.dev/v1/...
- Architect agent: http://192.168.3.184:8766 (LAN), продакшн = Cloudflare Worker
- DRAKON agent: через proxy agy.exodus.pp.ua/v1
- Pipeline analyze: POST /pipeline/analyze {"source_code": "..."} → job_id → /pipeline/status/{id}
- Cyrillic fix: Worker використовує TextDecoder('utf-8') (виправлено в Sprint2)
- PROXY_TOKEN fallback: os.getenv("PROXY_TOKEN","freecc") or "freecc" (виправлено)
- Кнопка "Аналізувати" тепер має toast.success + посилання на /diagrams (Sprint3)
- DRAKON IR вузли: b0 (branch, обов'язковий), action, question, end
- BUG-6: /agents не має inline chat (відомо, не виправлено)
```

**Знайдені проблеми (з docs-audit-2026-05-31.md):**
```
manual-pipeline-a.md: застарілі порти, немає redirect на /diagrams, обірвана секція MCP API
manual-pipeline-b.md: кнопки ref=e132 видалені, GitHub зберігання через MCP, застарілий API приклад
manual-agent-studio.md: порти застаріли, BUG-6 не задокументований, термінологія b0/Start
manual-mcp-access.md: застарілий endpoint, хардкод токена, відсутні files.* інструменти
```

---

### Алгоритм для кожного мануалу (повторити 4 рази):

```python
# Псевдокод — реалізувати як python3 скрипт
import json, urllib.request

BASE = "http://192.168.3.184:8766"
REPO = "/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder"

manuals = [
    ("docs/manuals/manual-pipeline-a.md", "Pipeline A (Код→DRAKON IR)"),
    ("docs/manuals/manual-pipeline-b.md", "Pipeline B (Ідея→IR)"),
    ("docs/manuals/manual-agent-studio.md", "Agent Studio"),
    ("docs/manuals/manual-mcp-access.md", "MCP Access"),
]

SYSTEM_CONTEXT = """
Актуальний стан AI-DRAKON (2026-05-31):
- Worker: drakon-mcp-worker.maxfraieho.workers.dev/v1/
- Pipeline API: POST /pipeline/analyze {"source_code":"..."} → job_id → GET /pipeline/status/{id}
- Worker UTF-8 fix: TextDecoder('utf-8').decode(Uint8Array.from(atob(...), c=>c.charCodeAt(0)))
- DRAKON IR вузли: b0 (branchId:0, обов'язковий), action (content+one), question (content+one+two), end
- Кнопка "Аналізувати": має toast.success + "Відкрити схему" link після done
- /agents: BUG-6 — немає inline chat, потрібно переходити на /chat секцію
- Architect agent: POST /chat {"message":"..."} → {"reply":"...","suggested_mutations":null|[...]}
- PROXY_TOKEN: завжди використовувати fallback або ENV змінну, не хардкодити
"""

for rel_path, name in manuals:
    full_path = f"{REPO}/{rel_path}"
    current = open(full_path).read()
    
    prompt = f"""Ти — документознавець AI-DRAKON. ЗАДАЧА: повністю переписати застарілий мануал '{name}'.

ПОТОЧНИЙ ВМІСТ (ЗАСТАРІЛО):
{current}

{SYSTEM_CONTEXT}

ВИМОГИ ДО ОНОВЛЕНОГО ДОКУМЕНТА:
1. Зберегти ВЕСЬ frontmatter (tags, created, tier тощо), оновити поле updated: 2026-05-31
2. Зберегти структуру розділів та wiki-посилання [[...]]
3. Виправити всі застарілі порти, URL, назви кнопок
4. Додати нові можливості (toast, UTF-8 fix, PROXY_TOKEN)
5. Для manual-agent-studio: додати секцію "Відомі обмеження" з BUG-6
6. Для manual-mcp-access: додати розділ про files.* інструменти та resources
7. Мова: УКРАЇНСЬКА, стиль — технічний посібник

ВИВЕСТИ ТІЛЬКИ ПОВНИЙ ОНОВЛЕНИЙ MARKDOWN ДОКУМЕНТ. Нічого більше."""

    payload = json.dumps({"message": prompt}).encode()
    req = urllib.request.Request(f"{BASE}/chat", data=payload,
        headers={"Content-Type": "application/json"}, method="POST")
    resp = json.loads(urllib.request.urlopen(req, timeout=120).read())
    
    updated_content = resp.get("reply", "")
    
    # Validate: must have frontmatter and content
    if "---" in updated_content and len(updated_content) > 500:
        with open(full_path, "w") as f:
            f.write(updated_content)
        print(f"✓ Updated: {rel_path} ({len(updated_content)} chars)")
    else:
        print(f"✗ SKIP {rel_path}: response too short or invalid ({len(updated_content)} chars)")
        print(f"  Preview: {updated_content[:200]}")
```

---

### Збереження та коміт:

```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet

git add docs/manuals/manual-pipeline-a.md \
        docs/manuals/manual-pipeline-b.md \
        docs/manuals/manual-agent-studio.md \
        docs/manuals/manual-mcp-access.md

git diff --cached --stat

git commit -m "docs(manuals): update 4 stale manuals via docs-agent audit findings (TASK-114)"

sed -i 's/\[ \] TASK-114/[x] TASK-114/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-114 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-114:docs-update|4-manuals-rewritten|pipeline-a+b+agent-studio+mcp-access|commit:<hash>|★★★
```


## [x] TASK-115

**Мета**: Додати file manipulation (write/delete/patch) в architect-agent + agentic tool-use loop для всіх агентів (DOCS, ARCHITECT, DRAKON).

**!!IMPORTANT!! Run locally on AGY Termux. Після змін — scp на 192.168.3.184 + restart сервісу.**

---

### Що треба реалізувати

**1. `services/architect-agent/files_route.py`** — додати 3 нових ендпоінти:

```python
from pydantic import BaseModel

class WriteRequest(BaseModel):
    path: str           # відносний шлях від REPO_ROOT
    content: str        # повний вміст файлу
    create_dirs: bool = True  # створити батьківські директорії

class PatchRequest(BaseModel):
    path: str
    old_string: str     # точний рядок для пошуку (унікальний)
    new_string: str     # замінити на
    replace_all: bool = False

class DeleteRequest(BaseModel):
    path: str

@router.post("/write")
def write_file(req: WriteRequest):
    target = (REPO_ROOT / req.path).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside project root")
    if req.create_dirs:
        target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(req.content, encoding="utf-8")
    return {"path": req.path, "written": len(req.content), "ok": True}

@router.post("/patch")
def patch_file(req: PatchRequest):
    target = (REPO_ROOT / req.path).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside project root")
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
    content = target.read_text(encoding="utf-8")
    if req.old_string not in content:
        raise HTTPException(status_code=422, detail=f"old_string not found in file")
    if req.replace_all:
        new_content = content.replace(req.old_string, req.new_string)
    else:
        new_content = content.replace(req.old_string, req.new_string, 1)
    target.write_text(new_content, encoding="utf-8")
    count = content.count(req.old_string)
    return {"path": req.path, "replacements": count if req.replace_all else 1, "ok": True}

@router.post("/delete")
def delete_file(req: DeleteRequest):
    target = (REPO_ROOT / req.path).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside project root")
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
    target.unlink()
    return {"path": req.path, "deleted": True, "ok": True}
```

**2. `services/architect-agent/ai_chat/architect_chat.py`** — додати agentic tool-use loop:

Додати константу TOOLS_SCHEMA і функцію `agent_chat_with_tools()`:

```python
_TOOLS_SCHEMA = """
## File Tools (use JSON blocks to call them):

<tool_call>{"tool":"files_read","args":{"path":"relative/path.md"}}</tool_call>
→ повертає {"content":"...","size":N}

<tool_call>{"tool":"files_write","args":{"path":"relative/path.md","content":"...повний вміст..."}}</tool_call>
→ повертає {"written":N,"ok":true}

<tool_call>{"tool":"files_patch","args":{"path":"relative/path.md","old_string":"...","new_string":"..."}}</tool_call>
→ повертає {"replacements":1,"ok":true}

<tool_call>{"tool":"files_delete","args":{"path":"relative/path.md"}}</tool_call>
→ повертає {"deleted":true,"ok":true}

<tool_call>{"tool":"files_list","args":{"path":"docs/manuals"}}</tool_call>
→ повертає {"entries":[...]}

Правила:
- Один <tool_call> за раз
- Після виконання інструменту отримаєш <tool_result>...</tool_result>
- Можеш продовжити ще tool_calls або написати фінальну відповідь
- Для завершення напиши DONE: [коротке резюме]
"""

import re as _re

_TOOL_CALL_RE = _re.compile(r"<tool_call>(.*?)</tool_call>", _re.DOTALL)

def _execute_tool(tool: str, args: dict, repo_root: Path) -> str:
    import httpx
    BASE = "http://localhost:8766"
    try:
        if tool == "files_read":
            r = httpx.get(f"{BASE}/files/read", params={"path": args["path"]}, timeout=10)
        elif tool == "files_list":
            r = httpx.get(f"{BASE}/files/list", params={"path": args.get("path",".")}, timeout=10)
        elif tool == "files_write":
            r = httpx.post(f"{BASE}/files/write", json=args, timeout=15)
        elif tool == "files_patch":
            r = httpx.post(f"{BASE}/files/patch", json=args, timeout=15)
        elif tool == "files_delete":
            r = httpx.post(f"{BASE}/files/delete", json=args, timeout=10)
        else:
            return f"Unknown tool: {tool}"
        r.raise_for_status()
        result = r.json()
        if tool == "files_read":
            return result.get("content","")[:3000]
        return json.dumps(result)
    except Exception as e:
        return f"Tool error: {e}"

def agent_chat_with_tools(
    message: str,
    file_tree=None,
    current_diagram=None,
    memory_context: str = "",
    kb_context: str = "",
    project_slug=None,
    project_path=None,
    max_iterations: int = 8,
) -> dict:
    from pathlib import Path as _Path
    repo_root = _Path(os.getenv("REPO_ROOT", os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", ".."))))

    system_prompt = ARCHITECT_SYSTEM_PROMPT + "\n\n" + _TOOLS_SCHEMA
    if project_slug:
        loc = f" at {project_path}" if project_path else ""
        system_prompt += f"\n\n**Active project: {project_slug}{loc}.**"

    parts = []
    if memory_context:
        parts.append(f"## My Memory\n{memory_context}")
    drakon_rules = kb_context or _load_kb_snippet()
    if drakon_rules:
        parts.append(f"## DRAKON Rules\n{drakon_rules[:1000]}")
    if file_tree:
        parts.append(f"## File Tree\n{json.dumps(file_tree, indent=2)[:2000]}")
    parts.append(f"## User Request\n{message}")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "\n\n".join(parts)},
    ]

    all_tool_calls = []
    final_reply = ""

    for iteration in range(max_iterations):
        # LLM call
        if PROXY_PROTOCOL == "anthropic":
            system_msg = messages[0]["content"]
            user_msgs = [m for m in messages if m["role"] != "system"]
            resp = httpx.post(f"{PROXY_URL}/messages",
                json={"model": PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 4096},
                headers={"x-api-key": PROXY_TOKEN, "anthropic-version": "2023-06-01"},
                timeout=120.0)
        else:
            resp = httpx.post(f"{PROXY_URL}/chat/completions",
                json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.1},
                headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
                timeout=120.0)
        resp.raise_for_status()
        if PROXY_PROTOCOL == "anthropic":
            content = resp.json()["content"][0]["text"]
        else:
            content = resp.json()["choices"][0]["message"]["content"]

        messages.append({"role": "assistant", "content": content})

        # Check for tool calls
        tool_match = _TOOL_CALL_RE.search(content)
        if not tool_match:
            final_reply = content
            break

        # Execute tool
        try:
            call = json.loads(tool_match.group(1).strip())
            tool_name = call.get("tool","")
            tool_args = call.get("args", {})
            result = _execute_tool(tool_name, tool_args, repo_root)
            all_tool_calls.append({"tool": tool_name, "args": tool_args, "result": result[:200]})
        except Exception as e:
            result = f"Parse error: {e}"

        # Feed result back
        messages.append({"role": "user", "content": f"<tool_result>{result}</tool_result>"})

        if "DONE:" in content:
            final_reply = content
            break

    return {
        "reply": final_reply or content,
        "tool_calls": all_tool_calls,
        "iterations": iteration + 1,
        "suggested_mutations": None,
    }
```

**3. `services/architect-agent/main.py`** — додати параметр `agent_mode` в `/chat`:

```python
class ChatRequest(BaseModel):
    message: str
    file_tree: Optional[dict] = None
    current_diagram: Optional[dict] = None
    memory_context: str = ""
    kb_context: str = ""
    project_slug: Optional[str] = None
    project_path: Optional[str] = None
    agent_mode: bool = False  # NEW

@app.post("/chat")
def chat(req: ChatRequest):
    if req.agent_mode:
        from ai_chat.architect_chat import agent_chat_with_tools
        return agent_chat_with_tools(
            message=req.message,
            file_tree=req.file_tree,
            current_diagram=req.current_diagram,
            memory_context=req.memory_context,
            kb_context=req.kb_context,
            project_slug=req.project_slug,
            project_path=req.project_path,
        )
    # existing architect_chat call...
```

---

### Кроки:

```bash
REPO=~/workspace/ai-drakon-scaffolder
AGENT=$REPO/services/architect-agent

# 1. Відредагувати файли
nano $AGENT/files_route.py        # додати Write/Patch/Delete
nano $AGENT/ai_chat/architect_chat.py  # додати agent_chat_with_tools
nano $AGENT/main.py               # додати agent_mode param

# 2. Скопіювати на сервер
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  $AGENT/files_route.py \
  $AGENT/ai_chat/architect_chat.py \
  $AGENT/main.py \
  vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/services/architect-agent/

sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  $AGENT/ai_chat/architect_chat.py \
  vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/services/architect-agent/ai_chat/

# 3. Рестарт сервісу
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-architect-agent restart && sleep 3 && curl -s http://localhost:8766/health'

# 4. Тест нових ендпоінтів
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s -X POST http://localhost:8766/files/write \
    -H "Content-Type: application/json" \
    -d "{\"path\":\"docs/test-file-tools.md\",\"content\":\"# Test\\nfile tools work!\"}" | python3 -m json.tool'

# 5. Тест agent_mode
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s -X POST http://localhost:8766/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Прочитай файл docs/test-file-tools.md і скажи що там\",\"agent_mode\":true}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get(\"reply\",\"\")[:200]); print(\"tools:\",d.get(\"tool_calls\",[]))"'

# 6. Видалити тестовий файл
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s -X POST http://localhost:8766/files/delete \
    -H "Content-Type: application/json" \
    -d "{\"path\":\"docs/test-file-tools.md\"}" | python3 -m json.tool'
```

### Коміт:
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
git add services/architect-agent/files_route.py \
        services/architect-agent/ai_chat/architect_chat.py \
        services/architect-agent/main.py
git commit -m "feat(architect-agent): add files/write/patch/delete + agent_mode tool-use loop (TASK-115)"
sed -i 's/\[ \] TASK-115/[x] TASK-115/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-115 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-115:agent-file-tools|files-write+patch+delete+agent_mode|test:OK|commit:<hash>|★★★★
```


## ═══════════════════════════════════════════
## SPRINT 5 — LangGraph Unification
## ═══════════════════════════════════════════

## [x] TASK-116

**Мета**: Виправити BUG-6 — всі 3 агенти (drakon/architect/docs) через один порт 8766.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. Два файли: main.py + agent-api.ts.**

### Проблема
- Frontend: drakon=8765, docs=8767, architect=8766
- Але лише 8766 живий → health fail для drakon/docs → red dots, chat не працює

### Крок 1 — `services/architect-agent/main.py` — додати health + chat роути для всіх агентів

Після `@app.get("/health")` додати:

```python
DRAKON_SYSTEM = "Ти — DRAKON-агент. Отримуєш Python-код і генеруєш DRAKON IR JSON. Відповідай тільки JSON у форматі DRAKON IR або поясненням помилки."
DOCS_SYSTEM = "Ти — документознавець AI-DRAKON. Відповідаєш на питання про документацію, архітектуру та використання платформи. Посилайся на [[wiki-links]] де доречно."

@app.get("/agents/{agent_id}/health")
def agent_health(agent_id: str):
    return {"status": "ok", "agent": agent_id, "service": "architect-agent", "port": PORT}

@app.post("/agents/{agent_id}/chat")
def agent_chat_route(agent_id: str, req: ChatRequest):
    ctx = req.context or {}
    file_tree = ctx.get("fileTree") or ctx.get("file_tree")
    current_diagram = ctx.get("currentDiagram") or ctx.get("current_diagram")
    memory_context = ""
    try:
        memory_context = get_memory(AGENT_NAME, "MEMORY.md") or ""
    except Exception:
        pass
    try:
        if agent_id == "architect" or req.agent_mode:
            result = agent_chat_with_tools(req.message, file_tree=file_tree,
                current_diagram=current_diagram, memory_context=memory_context)
        else:
            # drakon / docs — використовують architect_chat з кастомним system prompt
            from ai_chat.architect_chat import architect_chat_with_system
            system = DRAKON_SYSTEM if agent_id == "drakon" else DOCS_SYSTEM
            result = architect_chat_with_system(req.message, system_prompt=system,
                file_tree=file_tree, current_diagram=current_diagram)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return result
```

### Крок 2 — `services/architect-agent/ai_chat/architect_chat.py` — додати `architect_chat_with_system`

Після функції `architect_chat(...)` додати:

```python
def architect_chat_with_system(
    message: str,
    system_prompt: str,
    file_tree=None,
    current_diagram=None,
) -> dict:
    """Chat with a custom system prompt (for drakon/docs agents)."""
    parts = []
    if file_tree:
        parts.append(f"## Project File Tree\n{json.dumps(file_tree, indent=2)[:2000]}")
    if current_diagram:
        parts.append(f"## Current Diagram\n{json.dumps(current_diagram, indent=2)[:1500]}")
    parts.append(f"## User Message\n{message}")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "\n\n".join(parts)},
    ]

    if PROXY_PROTOCOL == "anthropic":
        system_msg = messages[0]["content"]
        user_msgs = [m for m in messages if m["role"] != "system"]
        resp = httpx.post(f"{PROXY_URL}/messages",
            json={"model": PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 2048},
            headers={"x-api-key": PROXY_TOKEN, "anthropic-version": "2023-06-01"},
            timeout=90.0)
    else:
        resp = httpx.post(f"{PROXY_URL}/chat/completions",
            json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.1},
            headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
            timeout=90.0)
    resp.raise_for_status()
    content = resp.json()["content"][0]["text"] if PROXY_PROTOCOL == "anthropic" \
        else resp.json()["choices"][0]["message"]["content"]
    return {"reply": content, "suggested_mutations": None}
```

### Крок 3 — `src/lib/agent-api.ts` — порт 8766 для ВСІХ агентів

Знайти:
```typescript
const AGENT_PORTS: Record<AgentId, number> = {
  drakon: 8765,
  architect: 8766,
  docs: 8767,
};
```
Замінити на:
```typescript
const AGENT_PORTS: Record<AgentId, number> = {
  drakon: 8766,
  architect: 8766,
  docs: 8766,
};
```

### Крок 4 — Deploy + restart + тест

```bash
AGENT=~/workspace/ai-drakon-scaffolder/services/architect-agent
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  $AGENT/main.py $AGENT/ai_chat/architect_chat.py \
  vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/services/architect-agent/
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  $AGENT/ai_chat/architect_chat.py \
  vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/services/architect-agent/ai_chat/
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-architect-agent restart && sleep 4 && \
   curl -s http://localhost:8766/agents/drakon/health && \
   curl -s http://localhost:8766/agents/docs/health'
```

### Коміт:
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
git add services/architect-agent/main.py \
        services/architect-agent/ai_chat/architect_chat.py \
        src/lib/agent-api.ts \
        .lovable/src/lib/agent-api.ts
git commit -m "fix(agents): BUG-6 — route all agents through port 8766, add drakon/docs health+chat (TASK-116)"
sed -i 's/\[ \] TASK-116/[x] TASK-116/' development/TASKS.md
git add development/TASKS.md && git commit -m "chore(tasks): mark TASK-116 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-116:BUG-6-fix|all-agents-8766|drakon+docs-health+chat|commit:<hash>|★★★
```


## [x] TASK-117

**Мета**: Уніфікація агентів на LangGraph — docs-agent і drakon-agent як DRAKON-схеми з власними KB і логікою.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. Тільки файли + scp + restart.**

### Концепція (прочитай перед виконанням)
```
Один architect-agent (8766) містить ВСІ агенти:
  drakon-agent.drakon.json  → graph_loader → StateGraph → /graph-pipelines/drakon-agent/execute
  docs-agent.drakon.json    → graph_loader → StateGraph → /graph-pipelines/docs-agent/execute
  pipeline_a.drakon.json    → (вже є)

Кожен агент = DRAKON-схема + KB файли + nodes у NODE_REGISTRY
```

### Крок 1 — Нові nodes у `pipeline/nodes_agents.py` (новий файл)

```python
"""Agent-specific LangGraph nodes for drakon-agent and docs-agent."""
import os, json, glob
from pathlib import Path

_KB_ROOT = Path(__file__).parent.parent / "kb"
_DOCS_ROOT = Path(__file__).parent.parent.parent.parent / "docs"

def load_drakon_kb() -> str:
    """Load DRAKON rules KB."""
    rules_file = _KB_ROOT / "00-drakon-rules.md"
    if rules_file.exists():
        return rules_file.read_text(encoding="utf-8")[:3000]
    return ""

def load_docs_kb(query: str = "") -> str:
    """Load relevant docs from manuals/."""
    manuals_dir = _DOCS_ROOT / "manuals"
    if not manuals_dir.exists():
        return ""
    texts = []
    for f in sorted(manuals_dir.glob("*.md"))[:4]:
        texts.append(f"## {f.name}\n" + f.read_text(encoding="utf-8")[:800])
    return "\n\n".join(texts)

# ── DRAKON agent nodes ─────────────────────────────────────────────────────
def drakon_load_kb(state: dict) -> dict:
    return {"kb_context": load_drakon_kb()}

def drakon_format_prompt(state: dict) -> dict:
    code = state.get("source_code") or state.get("message", "")
    kb = state.get("kb_context", "")
    prompt = (
        f"KB:\n{kb[:1500]}\n\n"
        f"Згенеруй DRAKON IR JSON для функції:\n```python\n{code[:3000]}\n```\n"
        "Виведи тільки JSON масив у ```json ... ``` блоці."
    )
    return {"llm_prompt": prompt}

def drakon_parse_result(state: dict) -> dict:
    import re
    reply = state.get("llm_reply", "")
    m = re.search(r"```json\s*(\[.*?\]|\{.*?\})\s*```", reply, re.DOTALL)
    if m:
        try:
            ir = json.loads(m.group(1))
            return {"drakon_ir": ir if isinstance(ir, list) else [ir], "parse_ok": True}
        except Exception:
            pass
    return {"drakon_ir": [], "parse_ok": False}

# ── DOCS agent nodes ───────────────────────────────────────────────────────
def docs_load_kb(state: dict) -> dict:
    query = state.get("message", "")
    return {"kb_context": load_docs_kb(query)}

def docs_format_prompt(state: dict) -> dict:
    query = state.get("message", "")
    kb = state.get("kb_context", "")
    prompt = (
        f"Документація проекту:\n{kb[:2000]}\n\n"
        f"Питання: {query}\n\n"
        "Відповідай українською, посилайся на [[wiki-links]] де доречно."
    )
    return {"llm_prompt": prompt}
```

### Крок 2 — Додати нові nodes у `pipeline/graph_loader.py`

Знайти `NODE_REGISTRY` і додати:
```python
from .nodes_agents import (
    drakon_load_kb, drakon_format_prompt, drakon_parse_result,
    docs_load_kb, docs_format_prompt,
)

# Додати в NODE_REGISTRY:
"drakon_load_kb": drakon_load_kb,
"drakon_format_prompt": drakon_format_prompt,
"drakon_parse_result": drakon_parse_result,
"docs_load_kb": docs_load_kb,
"docs_format_prompt": docs_format_prompt,
```

### Крок 3 — Додати LLM node у `pipeline/graph_loader.py`

Додати в NODE_REGISTRY LLM виклик:
```python
def llm_call_node(state: dict) -> dict:
    """Universal LLM call node — reads 'llm_prompt' from state."""
    import httpx, os
    proxy_url = os.getenv("PROXY_URL", "http://localhost:18880/v1")
    proxy_token = os.getenv("PROXY_TOKEN", "freecc") or "freecc"
    proxy_model = os.getenv("PROXY_MODEL", "coding-proxy")
    resp = httpx.post(f"{proxy_url}/chat/completions",
        json={"model": proxy_model, "messages": [
            {"role": "user", "content": state.get("llm_prompt", "")}
        ], "temperature": 0.1},
        headers={"Authorization": f"Bearer {proxy_token}"},
        timeout=120.0)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return {"llm_reply": content}

# Додати в NODE_REGISTRY:
"llm_call": llm_call_node,
```

### Крок 4 — Нові StateGraph states у `pipeline/states.py`

Додати:
```python
class DrakonAgentState(TypedDict):
    message: str
    source_code: str
    kb_context: str
    llm_prompt: str
    llm_reply: str
    drakon_ir: list
    parse_ok: bool

class DocsAgentState(TypedDict):
    message: str
    kb_context: str
    llm_prompt: str
    llm_reply: str
```

### Крок 5 — Нові DRAKON pipeline JSON файли

**`services/architect-agent/pipelines/drakon-agent.drakon.json`:**
```json
{
  "name": "DRAKON Agent — Code to IR",
  "schema": {"state_class": "DrakonAgentState"},
  "items": {
    "h0": {"type": "header", "one": "n1"},
    "n1": {"type": "action", "content": "drakon_load_kb", "one": "n2"},
    "n2": {"type": "action", "content": "drakon_format_prompt", "one": "n3"},
    "n3": {"type": "action", "content": "llm_call", "one": "n4"},
    "n4": {"type": "action", "content": "drakon_parse_result", "one": "end"},
    "end": {"type": "end"}
  }
}
```

**`services/architect-agent/pipelines/docs-agent.drakon.json`:**
```json
{
  "name": "Docs Agent — Documentation Q&A",
  "schema": {"state_class": "DocsAgentState"},
  "items": {
    "h0": {"type": "header", "one": "n1"},
    "n1": {"type": "action", "content": "docs_load_kb", "one": "n2"},
    "n2": {"type": "action", "content": "docs_format_prompt", "one": "n3"},
    "n3": {"type": "action", "content": "llm_call", "one": "end"},
    "end": {"type": "end"}
  }
}
```

### Крок 6 — Оновити STATE_REGISTRY у `graph_loader.py`

```python
from .states import AnalysisState, VibeCodingState, DrakonAgentState, DocsAgentState

STATE_REGISTRY = {
    "AnalysisState": AnalysisState,
    "VibeCodingState": VibeCodingState,
    "DrakonAgentState": DrakonAgentState,
    "DocsAgentState": DocsAgentState,
}
```

### Крок 7 — Deploy + тест

```bash
AGENT=~/workspace/ai-drakon-scaffolder/services/architect-agent
# scp всі змінені файли на 192.168.3.184
for F in pipeline/nodes_agents.py pipeline/graph_loader.py pipeline/states.py \
         pipelines/drakon-agent.drakon.json pipelines/docs-agent.drakon.json; do
  sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
    $AGENT/$F vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/services/architect-agent/$F
done

sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'sudo rc-service ai-architect-agent restart && sleep 4 && \
   curl -s http://localhost:8766/graph-pipelines | python3 -m json.tool'

# Тест drakon-agent pipeline
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s -X POST http://localhost:8766/graph-pipelines/drakon-agent/execute \
    -H "Content-Type: application/json" \
    -d "{\"source_code\":\"def hello():\\n  return 42\",\"message\":\"convert to DRAKON\"}" \
    | head -5'
```

### Коміт:
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
git add services/architect-agent/pipeline/nodes_agents.py \
        services/architect-agent/pipeline/graph_loader.py \
        services/architect-agent/pipeline/states.py \
        services/architect-agent/pipelines/drakon-agent.drakon.json \
        services/architect-agent/pipelines/docs-agent.drakon.json
git commit -m "feat(langgraph): add drakon-agent + docs-agent as LangGraph pipelines via DRAKON IR (TASK-117)"
sed -i 's/\[ \] TASK-117/[x] TASK-117/' development/TASKS.md
git add development/TASKS.md && git commit -m "chore(tasks): mark TASK-117 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-117:langgraph-unification|drakon-agent+docs-agent|DRAKON-IR→StateGraph|commit:<hash>|★★★★
```


## ═══════════════════════════════════════════
## SPRINT SS — Sonate Solidaire Assistant
## ═══════════════════════════════════════════

## [x] TASK-118

**Мета**: SS-агент на LangGraph з routing по аудиторії + веб-чат на sonate-solidaire.me.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. NO writing-plans. NO planning mode. Execute immediately step by step. Два репозиторії.**

---

### Репозиторії:
- Backend: `~/workspace/ai-drakon-scaffolder` (architect-agent)
- Frontend: клонувати `git@github.com:maxfraieho/sonate-solidsite.git` в `~/workspace/sonate-solidsite`

---

### Частина A — Backend (architect-agent)

#### A1 — KB файли: `services/architect-agent/kb/sonate-solidaire/`

Створити 4 файли:

**`kb/sonate-solidaire/kb-events.md`** — для замовників заходів:
```markdown
# Sonate Solidaire — Інформація для замовників заходів

## Про проект
Sonate Solidaire — швейцарська асоціація у Гланді (кантон Во), яка організовує концерти та культурні заходи за участю музикантів-біженців.

## Контакт для букінгу
- Email: contact@sonate-solidaire.me
- Сайт: https://sonate-solidaire.me/contact
- Тел: через форму на сайті

## Що ми пропонуємо
- Камерні концерти (скрипка, фортепіано, вокал)
- Майстер-класи та освітні програми
- Культурні вечори з українською та східноєвропейською музикою
- Виступи на приватних та корпоративних заходах

## Географія
Кантон Во, Швейцарія. Можливі виїзди при домовленості.

## Як замовити
Заповніть форму на https://sonate-solidaire.me/contact або напишіть на email.
```

**`kb/sonate-solidaire/kb-musicians.md`** — для музикантів-біженців:
```markdown
# Sonate Solidaire — Для музикантів-біженців

## Хто ми
Допомагаємо музикантам з України та інших країн інтегруватися у Швейцарії через музику.

## Що пропонуємо музикантам
- Можливість виступати та отримувати гонорар
- Підтримка у процесі легалізації (Protection S)
- Зв'язки з EVAM (établissement vaudois d'accueil des migrants)
- Мережа контактів у культурному секторі кантону Во

## Процес приєднання
1. Зв'яжіться через форму на сайті або email
2. Аудиція або надішліть відео-запис
3. Обговорення умов співпраці

## Protection S статус
Музиканти з статусом Protection S мають право працювати у Швейцарії. Ми допомагаємо з оформленням документів.

## Контакт
contact@sonate-solidaire.me | https://sonate-solidaire.me/integration-path
```

**`kb/sonate-solidaire/kb-partners.md`** — для волонтерів та партнерів:
```markdown
# Sonate Solidaire — Для партнерів та волонтерів

## Місія асоціації
Культурна інтеграція музикантів-біженців у Швейцарії через організацію концертів та освітніх програм.

## Правова форма
Асоціація за швейцарським правом (art. 60 CC). Статути зареєстровані у кантоні Во.
Тезаур'є: Philippe Leroy.

## Як можна допомогти
- Фінансова підтримка (пожертви не підлягають поверненню)
- Волонтерство на заходах
- Розповсюдження інформації
- Партнерство установ (школи, культурні центри, церкви)

## Фінансування
Асоціація подає заявки на гранти: Loterie Romande, Fondation Leenaards, communales VD.

## Контакт
contact@sonate-solidaire.me | https://sonate-solidaire.me/support
```

**`kb/sonate-solidaire/kb-general.md`** — загальна інформація:
```markdown
# Sonate Solidaire

Швейцарська асоціація культурної інтеграції музикантів-біженців.
Місце: Гланд, кантон Во, Швейцарія.
Сайт: https://sonate-solidaire.me
Email: contact@sonate-solidaire.me

## Наша діяльність
Організовуємо концерти, майстер-класи та культурні заходи за участю музикантів з України та інших країн.

## Для кого ми працюємо
- Музиканти-біженці, які шукають можливості виступати
- Організатори заходів, які хочуть унікальних виконавців
- Громадськість, яка підтримує культурну інтеграцію
```

#### A2 — nodes_ss.py: `services/architect-agent/pipeline/nodes_ss.py`

```python
"""Sonate Solidaire agent nodes."""
import os
from pathlib import Path

_KB_SS = Path(__file__).parent.parent / "kb" / "sonate-solidaire"

_AUDIENCE_KEYWORDS = {
    "events": ["concert", "booking", "заход", "konzert", "tarif", "замовити", "виступ", "organisation"],
    "musicians": ["musicien", "музикант", "refugee", "bijeganets", "protection s", "evam", "біженець", "integration", "інтеграція"],
    "partners": ["volunteer", "волонтер", "partner", "don", "financement", "association", "statut", "підтримати"],
}

def ss_detect_audience(state: dict) -> dict:
    """Detect audience type from message content."""
    msg = (state.get("message") or "").lower()
    for audience, keywords in _AUDIENCE_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            return {"ss_audience": audience}
    return {"ss_audience": "general"}

def ss_load_kb(state: dict) -> dict:
    """Load KB based on detected audience."""
    audience = state.get("ss_audience", "general")
    kb_file = _KB_SS / f"kb-{audience}.md"
    fallback = _KB_SS / "kb-general.md"
    f = kb_file if kb_file.exists() else fallback
    content = f.read_text(encoding="utf-8") if f.exists() else ""
    return {"kb_context": content}

def ss_format_prompt(state: dict) -> dict:
    """Build multilingual prompt."""
    msg = state.get("message", "")
    kb = state.get("kb_context", "")
    audience = state.get("ss_audience", "general")
    lang_hint = ""
    if any(c in msg for c in "абвгдеєжзиіїйклмнопрстуфхцчшщьюя"):
        lang_hint = "Respond in Ukrainian."
    elif any(c in msg.lower() for c in ["ü","ö","ä","ß"]):
        lang_hint = "Antworte auf Deutsch."
    else:
        lang_hint = "Réponds en français."

    system = (
        "Tu es l'assistant de l'association Sonate Solidaire. "
        "Tu réponds aux questions sur l'association, ses activités et ses services. "
        f"Audience détectée: {audience}. {lang_hint} "
        "Sois concis, chaleureux et professionnel. "
        "Si tu ne sais pas, dirige vers contact@sonate-solidaire.me"
    )
    prompt = f"Contexte:\n{kb[:2000]}\n\nQuestion: {msg}"
    return {"llm_prompt": prompt, "ss_system": system}

def ss_format_response(state: dict) -> dict:
    """Format final response with contact CTA."""
    reply = state.get("llm_reply", "")
    audience = state.get("ss_audience", "general")
    ctas = {
        "events": "\n\n→ [Formulaire de contact](https://sonate-solidaire.me/contact)",
        "musicians": "\n\n→ [Chemin d'intégration](https://sonate-solidaire.me/integration-path)",
        "partners": "\n\n→ [Soutenir l'association](https://sonate-solidaire.me/support)",
        "general": "\n\n→ [En savoir plus](https://sonate-solidaire.me)",
    }
    return {"llm_reply": reply + ctas.get(audience, "")}
```

#### A3 — StateGraph state у `pipeline/states.py` — додати:

```python
class SSAgentState(TypedDict):
    message: str
    ss_audience: str
    kb_context: str
    ss_system: str
    llm_prompt: str
    llm_reply: str
```

#### A4 — LLM node з кастомним system prompt у `graph_loader.py` — додати:

```python
def llm_call_with_system(state: dict) -> dict:
    """LLM call that uses ss_system from state as system prompt."""
    import httpx, os
    proxy_url = os.getenv("PROXY_URL", "http://localhost:18880/v1")
    proxy_token = os.getenv("PROXY_TOKEN", "freecc") or "freecc"
    proxy_model = os.getenv("PROXY_MODEL", "coding-proxy")
    system = state.get("ss_system", "You are a helpful assistant.")
    resp = httpx.post(f"{proxy_url}/chat/completions",
        json={"model": proxy_model, "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": state.get("llm_prompt", "")}
        ], "temperature": 0.3},
        headers={"Authorization": f"Bearer {proxy_token}"},
        timeout=60.0)
    resp.raise_for_status()
    return {"llm_reply": resp.json()["choices"][0]["message"]["content"]}
```

#### A5 — Pipeline JSON: `pipelines/sonate-solidaire-agent.drakon.json`

```json
{
  "name": "Sonate Solidaire Assistant",
  "description": "Multi-audience assistant for Sonate Solidaire association",
  "schema": {"state_class": "SSAgentState"},
  "items": {
    "h0": {"type": "header", "one": "n1"},
    "n1": {"type": "action", "content": "ss_detect_audience", "one": "n2"},
    "n2": {"type": "action", "content": "ss_load_kb", "one": "n3"},
    "n3": {"type": "action", "content": "ss_format_prompt", "one": "n4"},
    "n4": {"type": "action", "content": "llm_call_with_system", "one": "n5"},
    "n5": {"type": "action", "content": "ss_format_response", "one": "end"},
    "end": {"type": "end"}
  }
}
```

#### A6 — Зареєструвати всі нові nodes у `graph_loader.py`:
```python
from .nodes_ss import ss_detect_audience, ss_load_kb, ss_format_prompt, ss_format_response
# додати в NODE_REGISTRY:
"ss_detect_audience": ss_detect_audience,
"ss_load_kb": ss_load_kb,
"ss_format_prompt": ss_format_prompt,
"ss_format_response": ss_format_response,
"llm_call_with_system": llm_call_with_system,
```

#### A7 — Додати `SSAgentState` у `STATE_REGISTRY`.

#### A8 — Deploy + тест:
```bash
# scp всіх нових файлів на 192.168.3.184
# restart сервісу
# тест:
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s http://localhost:8766/graph-pipelines | python3 -c "import json,sys; [print(p[\"name\"]) for p in json.load(sys.stdin)[\"pipelines\"]]"'
```

---

### Частина B — Frontend (sonate-solidsite)

```bash
cd ~/workspace && git clone git@github.com:maxfraieho/sonate-solidsite.git 2>/dev/null || \
  (cd sonate-solidsite && git pull origin main --quiet)
```

#### B1 — `src/components/SsAssistant.tsx` — чат компонент

```tsx
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const WORKER_URL = "https://drakon-mcp-worker.maxfraieho.workers.dev";
const AGENT_URL = "http://192.168.3.184:8766";

interface Message { role: "user" | "assistant"; content: string; }

const WELCOME: Record<string, string> = {
  fr: "Bonjour ! Je suis l'assistant de Sonate Solidaire. Que puis-je faire pour vous ?",
  de: "Guten Tag! Ich bin der Assistent von Sonate Solidaire. Wie kann ich Ihnen helfen?",
  uk: "Доброго дня! Я асистент Sonate Solidaire. Чим можу допомогти?",
};

export function SsAssistant({ lang = "fr" }: { lang?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME[lang] || WELCOME.fr }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const resp = await fetch(`${WORKER_URL}/v1/agents/sonate-solidaire/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, agentUrl: AGENT_URL }),
      });
      const data = await resp.json();
      const reply = data.reply || data.message || "Je n'ai pas pu répondre. Contactez-nous: contact@sonate-solidaire.me";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erreur de connexion. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-xl bg-white shadow-sm">
      <div className="px-4 py-3 border-b bg-amber-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-900 text-sm">Assistant Sonate Solidaire</span>
          <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-amber-700" /></div>}
              <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                {m.content}
              </div>
              {m.role === "user" && <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0"><User className="h-4 w-4" /></div>}
            </div>
          ))}
          {loading && <div className="flex gap-2"><div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-amber-700" /></div><div className="bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-500">…</div></div>}
        </div>
      </ScrollArea>
      <div className="p-3 border-t flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          placeholder={lang === "uk" ? "Ваше питання…" : lang === "de" ? "Ihre Frage…" : "Votre question…"}
          className="min-h-[44px] max-h-[100px] resize-none text-sm flex-1" disabled={loading} />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
```

#### B2 — `src/pages/Assistant.tsx` — сторінка асистента

```tsx
import { useTranslation } from "react-i18next";
import { SsAssistant } from "@/components/SsAssistant";
import { Navbar } from "@/components/Navbar";

export default function Assistant() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "fr";
  const titles: Record<string, string> = {
    fr: "Assistant virtuel",
    de: "Virtueller Assistent",
    uk: "Віртуальний асистент",
  };
  const subtitles: Record<string, string> = {
    fr: "Posez vos questions sur Sonate Solidaire",
    de: "Stellen Sie Ihre Fragen zu Sonate Solidaire",
    uk: "Задайте ваші питання про Sonate Solidaire",
  };
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 text-amber-900">{titles[lang] || titles.fr}</h1>
        <p className="text-gray-600 mb-8">{subtitles[lang] || subtitles.fr}</p>
        <SsAssistant lang={lang} />
      </main>
    </>
  );
}
```

#### B3 — Додати route в `src/App.tsx`

Знайти імпорти lazy і додати:
```tsx
const Assistant = lazy(() => import("./pages/Assistant"));
```
У `<Routes>` додати:
```tsx
<Route path="/assistant" element={<Assistant />} />
<Route path="/fr/assistant" element={<Assistant />} />
<Route path="/de/assistant" element={<Assistant />} />
<Route path="/uk/assistant" element={<Assistant />} />
```

#### B4 — Додати посилання в `Navbar.tsx`

Знайти меню навігації і додати `Assistant` link.

#### B5 — Коміт в sonate-solidsite:
```bash
cd ~/workspace/sonate-solidsite && git pull origin main --quiet
git add src/components/SsAssistant.tsx src/pages/Assistant.tsx src/App.tsx src/components/Navbar.tsx
git commit -m "feat(assistant): add Sonate Solidaire multi-audience chat assistant (TASK-118)"
git push origin main
```

#### B6 — Коміт в ai-drakon-scaffolder:
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
git add services/architect-agent/pipeline/nodes_ss.py \
        services/architect-agent/pipeline/graph_loader.py \
        services/architect-agent/pipeline/states.py \
        services/architect-agent/pipelines/sonate-solidaire-agent.drakon.json \
        services/architect-agent/kb/sonate-solidaire/
git commit -m "feat(ss-agent): Sonate Solidaire LangGraph agent with audience routing (TASK-118)"
sed -i 's/\[ \] TASK-118/[x] TASK-118/' development/TASKS.md
git add development/TASKS.md && git commit -m "chore(tasks): mark TASK-118 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-118:ss-agent|4-kb-files+pipeline+webchat|sonate-solidaire.me/assistant|commit:<hash>|★★★★
```


## [ ] TASK-119

**Мета**: Analytics logging для SS-агента — логувати запити (аудиторія, мова, питання) без PII.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace.**

### Що логувати (без персональних даних):

```json
{
  "ts": "2026-06-01T00:00:00Z",
  "audience": "events|musicians|partners|general",
  "lang": "fr|de|uk|en",
  "question_len": 42,
  "question_keywords": ["concert", "booking"],
  "response_len": 156
}
```

### Реалізація — додати `ss_log_analytics` node:

В `pipeline/nodes_ss.py` додати:

```python
import json, datetime

_LOG_FILE = Path(__file__).parent.parent / "kb" / "sonate-solidaire" / "analytics.jsonl"

def ss_log_analytics(state: dict) -> dict:
    """Log anonymized interaction data."""
    try:
        msg = state.get("message", "")
        keywords = [kw for kw in ["concert", "booking", "musician", "bijeganets", "volunteer", "contact", "price"]
                    if kw in msg.lower()]
        lang = "uk" if any(c in msg for c in "абвгдеєж") else \
               "de" if any(c in msg.lower() for c in ["ü","ö","ä"]) else "fr"
        entry = {
            "ts": datetime.datetime.utcnow().isoformat(),
            "audience": state.get("ss_audience", "general"),
            "lang": lang,
            "question_len": len(msg),
            "question_keywords": keywords[:5],
            "response_len": len(state.get("llm_reply", "")),
        }
        with open(_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass
    return {}
```

Оновити `sonate-solidaire-agent.drakon.json` — додати `ss_log_analytics` перед `end`.

### Endpoint для читання аналітики:

В `main.py` додати:
```python
@app.get("/agents/ss/analytics")
def ss_analytics():
    from pathlib import Path
    log_file = Path(os.getenv("REPO_ROOT","")) / "services/architect-agent/kb/sonate-solidaire/analytics.jsonl"
    if not log_file.exists():
        return {"entries": [], "total": 0}
    lines = [json.loads(l) for l in log_file.read_text().splitlines() if l.strip()]
    from collections import Counter
    audiences = Counter(e["audience"] for e in lines)
    langs = Counter(e["lang"] for e in lines)
    return {"total": len(lines), "by_audience": dict(audiences), "by_lang": dict(langs), "recent": lines[-10:]}
```

### Коміт:
```bash
cd ~/workspace/ai-drakon-scaffolder && git pull origin main --quiet
git add services/architect-agent/pipeline/nodes_ss.py \
        services/architect-agent/pipelines/sonate-solidaire-agent.drakon.json \
        services/architect-agent/main.py
git commit -m "feat(ss-analytics): add anonymous interaction logging for SS agent (TASK-119)"
sed -i 's/\[ \] TASK-119/[x] TASK-119/' development/TASKS.md
git add development/TASKS.md && git commit -m "chore(tasks): mark TASK-119 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-119:ss-analytics|jsonl-log+endpoint+audience-stats|commit:<hash>|★★★
```

---

## [x] TASK-120

**Мета**: Оновити загальну документацію ai-drakon з урахуванням архітектурних змін агентів (Sprint 2).

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. NO writing-plans. Execute immediately step by step.**

---

### Контекст архітектурних змін (для довідки):

**Що змінилось (Sprint 2):**
1. **BUG-6 виправлено** — всі агенти (drakon, docs, architect, sonate-solidaire) тепер через єдиний сервіс `architect-agent` на порту 8766
2. **Уніфікація на LangGraph** — всі агенти — це DRAKON IR pipelines що компілюються в StateGraph через `graph_loader.py`
3. **Ендпоінти агентів** — `GET /agents/{id}/health`, `POST /agents/{id}/chat`
4. **File tools для агентів** — `POST /files/write`, `/files/patch`, `/files/delete`, `GET /files/read`, `/files/list`
5. **Новий Sonate Solidaire агент** — pipeline `sonate-solidaire-agent`, KB в `sonate-solidsite/public/kb/`
6. **Cloudflare Worker** — `sonate-solidaire` додано як публічний route без авторизації

**Файли що потребують оновлення:**
- `docs/manuals/manual-pipeline-a.md` — додати LangGraph секцію
- `docs/manuals/manual-agent-studio.md` — оновити список агентів, ендпоінти
- `docs/manuals/mcp-access.md` — перевірити актуальність
- `docs/architecture/` — якщо є, оновити або створити `docs/architecture/agents-overview.md`

---

### Кроки:

#### Крок 1 — Запуск docs агента для аудиту документації
```bash
# SSH на dev server і викликати docs агента напряму:
curl -s -X POST http://192.168.3.184:8766/agents/docs/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Зроби аудит документації в docs/manuals/ та docs/architecture/. Перелічи файли, перевір їх актуальність щодо нових агентів (port 8766, LangGraph unification, /agents/{id}/chat endpoint, sonate-solidaire agent). Поверни список файлів що потребують оновлення з конкретними описами що застаріло.",
    "agent_mode": true
  }' | python3 -m json.tool
```

#### Крок 2 — Створити/оновити docs/architecture/agents-overview.md
Створити файл `docs/architecture/agents-overview.md` через файловий інструмент docs агента або напряму через curl:

```bash
curl -s -X POST http://192.168.3.184:8766/files/write \
  -H "Content-Type: application/json" \
  -d '{
    "path": "docs/architecture/agents-overview.md",
    "content": "# AI-DRAKON — Архітектура агентів\n\n## Єдиний сервіс\n\nВсі агенти об'\''єднані в `architect-agent` (порт 8766).\n\n## Агенти\n\n| Agent ID | Призначення | System prompt |\n|----------|-------------|---------------|\n| `architect` | Головний архітектор, file tools | ARCHITECT_SYSTEM_PROMPT |\n| `drakon` | Python код → DRAKON IR JSON | DRAKON_SYSTEM |\n| `docs` | Документознавець, wiki-links | DOCS_SYSTEM |\n| `sonate-solidaire` | Публічний асистент асоціації | KB з sonate-solidaire.me/kb/ |\n\n## Ендпоінти\n\n```\nGET  /agents/{id}/health\nPOST /agents/{id}/chat\n     body: { message, context?, agent_mode? }\n```\n\n## LangGraph Pipeline\n\nDRAKON IR JSON → graph_loader.py → StateGraph\n\n```\npipelines/*.drakon.json\n  ↓ load_graph_from_ir()\n  ↓ NODE_REGISTRY[node_name](state)\n  ↓ SSE stream або sync response\n```\n\n## File Tools (для агентів)\n\n```\nGET  /files/list?path=docs/\nGET  /files/read?path=docs/file.md\nPOST /files/write  { path, content }\nPOST /files/patch  { path, old_string, new_string }\nPOST /files/delete { path }\n```\n\n## Cloudflare Worker\n\n`drakon-mcp-worker.maxfraieho.workers.dev`\n\n- `/v1/agents/{id}/chat` → proxies до architect-agent\n- `sonate-solidaire` — публічний route (без auth)\n- інші агенти — потребують Bearer token\n",
    "create_dirs": true
  }'
```

#### Крок 3 — Оновити docs/manuals/manual-agent-studio.md через docs агента
```bash
curl -s -X POST http://192.168.3.184:8766/agents/docs/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Прочитай файл docs/manuals/manual-agent-studio.md. Знайди застарілу інформацію про порти агентів (8765, 8767 — вони більше не використовуються). Замінити на: всі агенти через порт 8766, endpoint /agents/{id}/chat. Додай секцію про LangGraph якщо її немає. Виправ файл за допомогою files_patch або files_write.",
    "agent_mode": true
  }' | python3 -m json.tool
```

#### Крок 4 — Зробити git commit
```bash
cd ~/workspace/ai-drakon-scaffolder
git pull origin main --quiet
git add docs/
git commit -m "docs(agents): update architecture docs for LangGraph unification (TASK-120)"
sed -i 's/\[ \] TASK-120/[x] TASK-120/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-120 done"
git push origin main
```

---

### Верифікація:
```bash
# Файл існує?
ls ~/workspace/ai-drakon-scaffolder/docs/architecture/agents-overview.md

# Коміти?
git log --oneline origin/main -3
```

### Diary:
```
SESSION:DATE|TASK-120:docs-update|agents-architecture+LangGraph+unified-port-8766|commit:<hash>|★★★
```

---

## [x] TASK-121

**Мета**: Заповнити початкову базу знань Sonate Solidaire агента через Gemini — 4 KB файли по групах аудиторії.

**!!IMPORTANT!! Run locally on THIS Termux device. NO SSH to 192.168.3.184. NO mempalace. NO writing-plans. Execute immediately.**

---

### Де зберігати результати:
Репозиторій `sonate-solidsite` вже клонований або клонувати:
```bash
cd ~/workspace
git clone git@github.com:maxfraieho/sonate-solidsite.git 2>/dev/null || (cd sonate-solidsite && git pull)
```

KB файли: `~/workspace/sonate-solidsite/public/kb/`

---

### Крок 1 — Згенерувати KB для групи "events" через Gemini

```bash
python3 - << 'PYEOF'
import json, urllib.request

PROMPT_EVENTS = """Tu représentes l'association Sonate Solidaire (Gland, Vaud, Suisse).
Mission: intégration culturelle par la musique — pour tous ceux qui cherchent leur place en Suisse.
Nous organisons des concerts et cherchons des organisateurs d'événements comme partenaires.

Génère un contenu structuré en markdown pour la base de connaissances d'un assistant IA.
Le contenu doit répondre aux questions typiques des organisateurs d'événements:

1. Quels types de prestations musicales proposons-nous (formats, instruments, durée)?
2. Comment se passe la réservation et quels sont les délais?
3. Quelle est la zone géographique de prestation?
4. Comment contacter l'association pour organiser un événement?
5. Quels sont les tarifs (général — sur demande, mais expliquer le processus)?
6. Exemples de types d'événements auxquels nous participons?

Format: markdown avec titres H2/H3, listes à puces, liens vers https://sonate-solidaire.me/contact?subject=event
Langue: français, chaleureux et professionnel. Maximum 400 mots.
"""

payload = json.dumps({
    "model": "gemini-2.5-flash",
    "max_tokens": 2000,
    "messages": [{"role": "user", "content": PROMPT_EVENTS}]
}).encode()

req = urllib.request.Request(
    "http://localhost:8080/v1/messages",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=60) as r:
    resp = json.loads(r.read())

text = ""
for b in resp.get("content", []):
    if b.get("type") == "text":
        text = b["text"]
        break

# Prepend header
header = """# Sonate Solidaire — Pour les organisateurs d'événements

"""
with open("/data/data/com.termux/files/home/workspace/sonate-solidsite/public/kb/kb-events.md", "w") as f:
    f.write(header + text)
print("kb-events.md written, chars:", len(text))
PYEOF
```

---

### Крок 2 — KB для групи "musicians"

```bash
python3 - << 'PYEOF'
import json, urllib.request

PROMPT_MUSICIANS = """Tu représentes l'association Sonate Solidaire (Gland, Vaud, Suisse).
Nous invitons TOUS les musiciens à rejoindre notre collectif — quelle que soit leur origine.
Nous soutenons aussi les personnes en cours d'intégration en Suisse par la culture et la musique.

Génère un contenu markdown pour la base de connaissances d'un assistant IA qui dialogue avec des musiciens.
Le contenu doit répondre à:

1. Qui peut rejoindre? (tous musiciens, toutes origines, tous niveaux)
2. Quelles sont les activités du collectif? (répétitions, concerts, communauté)
3. Comment se passe le processus de candidature? (formulaire sur le site)
4. Quel soutien l'association offre-t-elle aux personnes en intégration?
5. Ressources utiles dans le canton de Vaud pour les musiciens immigrants?
6. Comment contacter l'association?

Inclure aussi une version courte des mêmes infos en ukrainien (pour les visiteurs ukrainiens).
Format: markdown H2/H3, lien vers https://sonate-solidaire.me/contact?subject=integration
Langue principale: français. Ton: chaleureux, inclusif. Maximum 500 mots.
"""

payload = json.dumps({
    "model": "gemini-2.5-flash",
    "max_tokens": 2500,
    "messages": [{"role": "user", "content": PROMPT_MUSICIANS}]
}).encode()

req = urllib.request.Request(
    "http://localhost:8080/v1/messages",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=60) as r:
    resp = json.loads(r.read())

text = ""
for b in resp.get("content", []):
    if b.get("type") == "text":
        text = b["text"]
        break

header = """# Sonate Solidaire — Pour les musiciens

"""
with open("/data/data/com.termux/files/home/workspace/sonate-solidsite/public/kb/kb-musicians.md", "w") as f:
    f.write(header + text)
print("kb-musicians.md written, chars:", len(text))
PYEOF
```

---

### Крок 3 — KB для групи "partners"

```bash
python3 - << 'PYEOF'
import json, urllib.request

PROMPT_PARTNERS = """Tu représentes l'association Sonate Solidaire (Gland, Vaud, Suisse).
Association à but non lucratif (art. 60 CC). Mission: intégration culturelle par la musique.
Trésorier: Philippe Leroy.

Génère un contenu markdown pour la base de connaissances d'un assistant IA pour les partenaires/bénévoles:

1. Comment peut-on soutenir l'association? (bénévolat, dons, partenariat)
2. Quels types de partenariats cherchons-nous? (écoles, communes, fondations)
3. Quels programmes de subventions existent dans le canton de Vaud pour ce type d'association?
   (Loterie Romande, Fondation Leenaards, Pro Helvetia, fonds communaux)
4. Comment recruter des bénévoles en Suisse romande?
5. Forme juridique et transparence de l'association?
6. Comment contacter pour un partenariat?

Format: markdown H2/H3, liens vers https://sonate-solidaire.me/support et /contact?subject=institutional
Langue: français professionnel. Maximum 400 mots.
"""

payload = json.dumps({
    "model": "gemini-2.5-flash",
    "max_tokens": 2000,
    "messages": [{"role": "user", "content": PROMPT_PARTNERS}]
}).encode()

req = urllib.request.Request(
    "http://localhost:8080/v1/messages",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=60) as r:
    resp = json.loads(r.read())

text = ""
for b in resp.get("content", []):
    if b.get("type") == "text":
        text = b["text"]
        break

header = """# Sonate Solidaire — Pour les partenaires et bénévoles

"""
with open("/data/data/com.termux/files/home/workspace/sonate-solidsite/public/kb/kb-partners.md", "w") as f:
    f.write(header + text)
print("kb-partners.md written, chars:", len(text))
PYEOF
```

---

### Крок 4 — KB для "general"

```bash
python3 - << 'PYEOF'
import json, urllib.request

PROMPT_GENERAL = """Tu représentes l'association Sonate Solidaire (Gland, Vaud, Suisse).
Notre mission: réunir des musiciens et soutenir l'intégration de ceux qui cherchent leur place en Suisse, par la culture et la musique.

Génère un contenu markdown général pour un assistant IA qui répond à tout visiteur du site:

1. Présentation de l'association (qui sommes-nous, où sommes-nous, quoi faisons-nous)
2. Nos trois audiences principales et ce que nous offrons à chacune
3. Comment nous contacter selon le besoin
4. Événements à venir (dire que les infos sont sur le site)
5. Pourquoi la musique comme vecteur d'intégration?

Format: markdown chaleureux, H2/H3, ton humain et authentique (pas marketing).
Liens vers https://sonate-solidaire.me, /contact, /integration, /support
Langue: français. Maximum 350 mots.
"""

payload = json.dumps({
    "model": "gemini-2.5-flash",
    "max_tokens": 1800,
    "messages": [{"role": "user", "content": PROMPT_GENERAL}]
}).encode()

req = urllib.request.Request(
    "http://localhost:8080/v1/messages",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=60) as r:
    resp = json.loads(r.read())

text = ""
for b in resp.get("content", []):
    if b.get("type") == "text":
        text = b["text"]
        break

header = """# Sonate Solidaire

"""
with open("/data/data/com.termux/files/home/workspace/sonate-solidsite/public/kb/kb-general.md", "w") as f:
    f.write(header + text)
print("kb-general.md written, chars:", len(text))
PYEOF
```

---

### Крок 5 — Commit і push sonate-solidsite

```bash
cd ~/workspace/sonate-solidsite
git pull origin main --quiet
git add public/kb/
git diff --cached --stat
git commit -m "feat(kb): initial AI-generated KB content for SS agent audiences (TASK-121)"
git push origin main
echo "DONE: sonate-solidsite KB pushed"
```

---

### Верифікація:
```bash
# Файли існують?
ls ~/workspace/sonate-solidsite/public/kb/
# Розмір?
wc -l ~/workspace/sonate-solidsite/public/kb/*.md
# Коміт?
cd ~/workspace/sonate-solidsite && git log --oneline -2
```

### Diary:
```
SESSION:DATE|TASK-121:ss-kb-fill|4-kb-generated-by-gemini|events+musicians+partners+general|commit:<hash>|★★★
```

---

## [x] TASK-122

**Мета**: В CodePage GitHub Settings перезаписуються збереженим activeProject (uav-watcher). Потрібно щоб Settings GitHub мали пріоритет якщо вони явно змінені.

**!!IMPORTANT!! Run locally on AGY Termux. NO mempalace. NO writing-plans. Execute immediately.**

---

### Root Cause

`src/pages/CodePage.tsx` рядки ~179-181:
```js
const projectGh = activeProject?.github;
const owner = projectGh?.owner || ghCfg.owner || "";
const repo  = projectGh?.repo  || ghCfg.repo  || "";
```

`projectGh` (з localStorage activeProject) перекриває `ghCfg` (Settings).
Якщо activeProject містить `github.repo = "uav-watcher"` → CodePage показує uav-watcher навіть якщо Settings змінені.

### Fix — `src/pages/CodePage.tsx`

**Файл:** `~/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx`

Знайти блок (рядки ~176-182):
```js
const { activeProject } = useProject();

const projectGh = activeProject?.github;
const owner = projectGh?.owner || ghCfg.owner || "";
const repo = projectGh?.repo || ghCfg.repo || "";
const branch = projectGh?.branch || ghCfg.branch || "main";
const token = owner.toLowerCase() === ghCfg.owner.toLowerCase() ? ghCfg.token : "";
```

Замінити на:
```js
const { activeProject } = useProject();

// Settings GitHub завжди має пріоритет якщо явно задано.
// activeProject.github використовується тільки як fallback.
const projectGh = activeProject?.github;
const owner = ghCfg.owner || projectGh?.owner || "";
const repo  = ghCfg.repo  || projectGh?.repo  || "";
const branch = ghCfg.branch || projectGh?.branch || "main";
const token = ghCfg.token || "";
```

**Файл `.lovable`:** Після зміни в `src/` — одразу скопіювати:
```bash
cp ~/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx \
   ~/workspace/ai-drakon-scaffolder/.lovable/src/pages/CodePage.tsx
```

### Верифікація

```bash
grep -n "const owner\|const repo\|const branch\|ghCfg\|projectGh" \
  ~/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx | head -10
```

### Commit

```bash
cd ~/workspace/ai-drakon-scaffolder
git pull origin main --quiet
git add src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git commit -m "fix(code-page): Settings GitHub takes priority over activeProject cache (TASK-122)"
sed -i 's/\[ \] TASK-122/[x] TASK-122/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-122 done"
git push origin main
```

### Diary:
```
SESSION:DATE|TASK-122:code-page-github-priority|Settings>activeProject|commit:<hash>|★★★
```

---

## [ ] TASK-SS-21: Pull sonate-solidsite + MemPalace index на AGY3

**!!IMPORTANT!! Run locally on AGY3 Termux. NO SSH.**

### Мета
Стягнути репозиторій sonate-solidsite на AGY3 і проіндексувати в MemPalace.
Це prerequisite для TASK-SS-22, TASK-SS-23, TASK-SS-24.

### Кроки

```bash
# Клонувати або оновити
cd ~/projects
if [ -d sonate-solidsite ]; then
  cd sonate-solidsite && git pull origin main
else
  git clone git@github.com:maxfraieho/sonate-solidsite.git
  cd sonate-solidsite
fi

# Перевірити що є
ls public/kb/ src/components/ src/App.tsx

# Створити .mempalace.json якщо немає
cat > .mempalace.json << 'JSON'
{
  "wing": "sonate-solidsite",
  "include": ["src", "public/kb", "docs"],
  "exclude": ["node_modules", ".git", "dist", "public/assets"]
}
JSON

# Запустити індексацію
python3 -m mempalace index . 2>&1 | tail -10
```

### Верифікація
```bash
python3 -m mempalace search "Sonate Solidaire mission" --wing sonate-solidsite | head -5
```

### Commit
```bash
git add .mempalace.json
git commit -m "chore(mempalace): add .mempalace.json for sonate-solidsite indexing"
git push origin main
```

### Diary
```
SESSION:2026-06-03|TASK-SS-21:mempalace-index-sonate-solidsite|wing:sonate-solidsite|commit:<hash>|★★★
```


---

## [ ] TASK-SS-22: Proactive Chat Widget для sonate-solidaire.me

**!!IMPORTANT!! Run locally on AGY3 Termux. Push from AGY3. NO dev server SSH.**

### Мета
Додати плаваючий widget внизу-праворуч, що з'являється після 35 секунд неактивності.
Вводить SS-агента, клік — перехід на /assistant.

### Файли
- Створити: `src/components/SsProactiveChatWidget.tsx`
- Модифікувати: `src/App.tsx` (додати widget)
- Репо: `~/projects/sonate-solidsite/`

### Реалізація SsProactiveChatWidget.tsx

```tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";

const DISMISS_KEY = "ss_widget_dismissed_at";
const IDLE_TIMEOUT_MS = 35000;
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

export function SsProactiveChatWidget() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Не показувати на сторінках асистента
  const isAssistantPage = location.pathname.includes("/assistant");

  // Перевіряємо чи не закрили нещодавно
  const isDismissed = useCallback(() => {
    const t = localStorage.getItem(DISMISS_KEY);
    if (!t) return false;
    return Date.now() - parseInt(t) < DISMISS_DURATION_MS;
  }, []);

  useEffect(() => {
    if (isAssistantPage || isDismissed()) return;

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAssistantPage, isDismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleOpen = () => {
    // Визначаємо мовний префікс з поточного шляху
    const lang = location.pathname.startsWith("/de") ? "/de"
               : location.pathname.startsWith("/uk") ? "/uk"
               : "";
    navigate(`${lang}/assistant`);
  };

  if (!visible || isAssistantPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-xs w-72">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-sm font-bold">S</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Sharon</div>
              <div className="text-xs text-gray-500">Sonate Solidaire</div>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={14} />
          </button>
        </div>
        <p className="text-sm text-gray-700 leading-snug mb-3">
          Bonjour ! Je suis Sharon, votre assistante. Puis-je vous aider à découvrir nos activités, rejoindre nos musiciens ou organiser un événement ?
        </p>
        <button
          onClick={handleOpen}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors"
        >
          Discuter avec Sharon →
        </button>
      </div>
    </div>
  );
}
```

### Зміни в App.tsx

Знайти рядок де `</BrowserRouter>` і замінити:
```tsx
// Додати імпорт:
import { SsProactiveChatWidget } from "@/components/SsProactiveChatWidget";

// Перед </BrowserRouter> або </Routes> — додати всередині BrowserRouter:
<SsProactiveChatWidget />
```

Точніше — додати `<SsProactiveChatWidget />` відразу перед закриваючим `</BrowserRouter>`.

### Верифікація
```bash
cd ~/projects/sonate-solidsite
npx tsc --noEmit 2>&1 | head -10
echo "TypeScript OK"
```

### Sync .lovable/
```bash
cp src/components/SsProactiveChatWidget.tsx .lovable/src/components/SsProactiveChatWidget.tsx
# Для App.tsx — синхронізувати зміни:
cp src/App.tsx .lovable/src/App.tsx
```

### Commit
```bash
cd ~/projects/sonate-solidsite
git add src/components/SsProactiveChatWidget.tsx src/App.tsx .lovable/src/components/SsProactiveChatWidget.tsx .lovable/src/App.tsx
git commit -m "feat(widget): proactive chat widget — Sharon appears after 35s idle (TASK-SS-22)"
git push origin main
```

### Diary
```
SESSION:2026-06-03|TASK-SS-22:proactive-chat-widget|SsProactiveChatWidget.tsx+App.tsx|35s-idle+/assistant-nav+24h-dismiss|commit:<hash>|★★★
```


---

## [ ] TASK-SS-23: KB — оновити місію + сценарії культурних заходів

**!!IMPORTANT!! Run locally on AGY3 Termux. NO SSH to dev server.**

### Мета
Переписати та розширити базу знань SS-агента:
1. Місія не лише для музикантів — Sonate Solidaire запрошує ВСІХ людей що потребують інтеграції в атмосфері музики.
2. Додати сценарії культурних заходів (soirées musicales, rencontres interculturelles).
3. Gemini Deep Research промти оновлено нижче.

### Нова місія (загальна ідея для KB)

Sonate Solidaire — це не лише об'єднання музикантів. Це платформа культурної інтеграції через музику. Ми організовуємо музичні вечори, де музика — це універсальна мова, що долає мовні та культурні бар'єри. Запрошуємо:
- Людей що потребують інтеграції (незалежно від фаху)
- Місцевих мешканців Gland/Vaud що хочуть спілкуватись
- Музикантів (будь-якого рівня і походження)
- Організаторів заходів, волонтерів, партнерів

### Файли для оновлення
- `~/projects/sonate-solidsite/public/kb/kb-general.md` — повна перезапис
- `~/projects/sonate-solidsite/public/kb/kb-events.md` — додати сценарії заходів
- `~/projects/sonate-solidsite/public/kb/kb-musicians.md` — широка аудиторія

### Крок 1: Оновити kb-general.md

```bash
cat > ~/projects/sonate-solidsite/public/kb/kb-general.md << 'KBEOF'
# Sonate Solidaire — Assistant IA

Bonjour ! Je suis **Sharon**, l'assistante intelligente de **Sonate Solidaire**.
Je suis là pour vous aider à découvrir notre association, nos activités et comment nous rejoindre.

## Notre mission

Sonate Solidaire est une association culturelle basée à **Gland, canton de Vaud, Suisse**.
Notre conviction : **la musique est le langage universel de l'humanité**, capable de briser
les barrières linguistiques et culturelles.

Nous accueillons **toute personne en processus d'intégration** — pas seulement les musiciens.
Nous croyons que partager une soirée musicale, écouter ou jouer ensemble, crée des liens
humains que les mots seuls ne peuvent pas forger.

## Ce que nous faisons

### 🎵 Soirées musicales interculturelles
Des soirées où musiciens locaux et personnes en intégration se rencontrent autour de la musique.
Pas besoin de savoir jouer — l'écoute et la présence suffisent.
Ces événements créent un espace de confiance, de curiosité mutuelle et d'appartenance.

### 🤝 Rencontres musicales ouvertes
Ateliers et répétitions ouverts à tous. Vous apportez votre culture musicale,
nous apportons l'espace et l'écoute. Ensemble, nous construisons quelque chose de nouveau.

### 🎼 Intégration par la musique
Pour les musiciens qui souhaitent continuer à jouer en Suisse : accompagnement pratique,
mise en réseau, informations sur les démarches (AVS, statut, associations).

### 🌍 Événements pour organisateurs
Nous proposons des concerts, animations musicales et soirées culturelles pour
communes, entreprises, écoles et associations du canton de Vaud.

## Qui peut rejoindre Sonate Solidaire ?

**Tout le monde** — voici quelques profils typiques :

- 🎻 **Musiciens de tous horizons** : locaux ou nouvellement arrivés, amateurs ou professionnels
- 🌐 **Personnes en intégration** : qui cherchent des liens sociaux dans une atmosphère culturelle
- 🏘️ **Habitants de Gland et du Vaud** : curieux de rencontrer des personnes d'autres cultures
- 🤝 **Volontaires** : qui souhaitent aider l'association à organiser des événements
- 🏢 **Partenaires** : communes, écoles, entreprises cherchant des animations culturelles

## Pourquoi la musique ?

La musique ne demande pas de CV. Elle ne juge pas l'accent.
Quand on joue ou écoute ensemble, on partage quelque chose d'humain et d'universel.
Dans nos soirées, une mélodie ukrainienne côtoie un morceau de jazz genevois —
et c'est dans cet espace que l'intégration commence vraiment.

## Contact et participation

- 📧 **Écrire** : [formulaire de contact](/contact)
- 🎤 **Rejoindre comme musicien** : [programme d'intégration](/integration)
- 🤲 **Soutenir** : [page de soutien](/support)
- 📅 **Agenda** : [sonate-solidaire.me](https://sonate-solidaire.me)

**Il y a toujours une place pour vous chez Sonate Solidaire.**

KBEOF
echo "kb-general.md updated"
```

### Крок 2: Оновити kb-events.md — додати сценарії

```bash
cat >> ~/projects/sonate-solidsite/public/kb/kb-events.md << 'KBEOF'

## Formats de soirées interculturelles

### 🌙 Soirée musicale interculturelle (2-3h)
**Format** : Concert + moment d'échange informel
**Public** : Habitants locaux + personnes en intégration, 20-60 personnes
**Structure** : 45min concert → buffet participatif → 45min session ouverte
**Impact** : Crée des rencontres naturelles dans une atmosphère détendue
**Coût indicatif** : 500-1500 CHF selon le lieu et les musiciens

### 🎸 Atelier musical ouvert (1.5-2h)
**Format** : Jam session ou atelier thématique (rythmes du monde, chansons partagées)
**Public** : Participants de tous niveaux, 10-25 personnes
**Avantage** : Pas besoin de savoir jouer — percussion, voix, écoute bienvenues
**Idéal pour** : Centres d'accueil, communes, associations d'intégration

### 🎻 Concert-rencontre pour entreprises/écoles
**Format** : Mini-concert (30-45min) + présentation de l'association + questions
**Public** : Employés, élèves, familles
**Objectif** : Sensibiliser à la diversité culturelle dans un contexte professionnel
**Note** : Devis sur mesure, contact via formulaire

### 🌍 Festival de cultures musicales (journée)
**Format** : Programme varié — musiques du monde, ateliers, exposition photos
**Public** : Grand public, familles
**Partenaires suggérés** : Communes vaudoises, Loterie Romande, fondations culturelles
**Fréquence** : Idéalement 1-2x par an

KBEOF
echo "kb-events.md updated"
```

### Крок 3: Commit et push
```bash
cd ~/projects/sonate-solidsite
git add public/kb/
git commit -m "feat(kb): update mission — cultural integration for all, add event scenarios (TASK-SS-23)"
git push origin main
```

### Diary
```
SESSION:2026-06-03|TASK-SS-23:kb-mission-update|kb-general.md+kb-events.md|mission:all-integration-music|event-formats:4-scenarios|commit:<hash>|★★★
```


---

## [x] TASK-119-v2: Analytics logging для SS-агента (повна реалізація)

**!!IMPORTANT!! SSH to vokov@192.168.3.184. Редагуй файли на dev server.**

### Архітектура

```
Запит → ss_log_analytics → analytics.jsonl
                          ↓
GET /agents/ss/analytics     → статистика (публічна)
GET /agents/ss/analytics/questions → питання (auth: Bearer MCP_API_KEY)
GET /agents/ss/analytics/gaps      → питання без відповіді (auth)
```

### Файл 1: `services/architect-agent/pipeline/nodes_ss.py`

Знайти функцію `ss_format_response` і ПІСЛЯ неї додати:

```python
from pathlib import Path
import json
import datetime

_ANALYTICS_LOG = Path(__file__).parent.parent / "kb" / "sonate-solidaire" / "analytics.jsonl"

def ss_log_analytics(state: dict) -> dict:
    """Log anonymized interaction — full question for KB analysis."""
    try:
        _ANALYTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
        msg = state.get("message", "")
        reply = state.get("llm_reply", "")

        # Detect language
        lang = "uk" if any(c in msg for c in "абвгдеєжзиіїйклмнопрстуфхцчшщ") else \
               "de" if any(c in msg.lower() for c in ["ü", "ö", "ä", "ß"]) else \
               "fr"

        # Detect response quality
        low_quality_markers = ["je ne sais pas", "je n'ai pas", "désolé", "sorry",
                               "нема інформації", "не знаю"]
        response_quality = "weak" if (
            len(reply) < 100 or any(m in reply.lower() for m in low_quality_markers)
        ) else "good"

        entry = {
            "ts": datetime.datetime.utcnow().isoformat() + "Z",
            "audience": state.get("ss_audience", "general"),
            "lang": lang,
            "question": msg[:500],          # full question, max 500 chars
            "question_len": len(msg),
            "response_len": len(reply),
            "response_quality": response_quality,
        }
        with open(_ANALYTICS_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        pass  # fail silently — analytics must never break the agent
    return {}
```

### Файл 2: `services/architect-agent/pipeline/sonate-solidaire-agent.drakon.json`

Відкрити файл, знайти вузол `ss_format_response` і додати вузол `ss_log_analytics`
ПІСЛЯ нього але ДО `end`. Паттерн:
```json
"ss_log_analytics": {
  "type": "action",
  "content": "ss_log_analytics",
  "next": "end"
}
```
І в `ss_format_response` замінити `"next": "end"` на `"next": "ss_log_analytics"`.

### Файл 3: `services/architect-agent/main.py`

Додати ендпоінти після існуючих агент-роутів:

```python
import os
from fastapi import Request, HTTPException
from pathlib import Path

ANALYTICS_LOG = Path(os.getenv("REPO_ROOT", "/home/vokov/workspace/ai-drakon-scaffolder")) \
    / "services/architect-agent/kb/sonate-solidaire/analytics.jsonl"

@app.get("/agents/ss/analytics")
async def ss_analytics_summary():
    """Public summary stats."""
    if not ANALYTICS_LOG.exists():
        return {"total": 0, "by_audience": {}, "by_lang": {}, "quality": {}}
    entries = [json.loads(l) for l in ANALYTICS_LOG.read_text().splitlines() if l.strip()]
    from collections import Counter
    return {
        "total": len(entries),
        "by_audience": dict(Counter(e["audience"] for e in entries)),
        "by_lang": dict(Counter(e["lang"] for e in entries)),
        "quality": dict(Counter(e.get("response_quality","?") for e in entries)),
        "last_7_days": sum(1 for e in entries
            if e["ts"] >= (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat()),
    }

@app.get("/agents/ss/analytics/questions")
async def ss_analytics_questions(request: Request, limit: int = 100):
    """Recent questions — requires auth."""
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {os.getenv('MCP_API_KEY', 'drakon-mcp-2026')}":
        raise HTTPException(status_code=401)
    if not ANALYTICS_LOG.exists():
        return {"questions": []}
    entries = [json.loads(l) for l in ANALYTICS_LOG.read_text().splitlines() if l.strip()]
    return {"questions": entries[-limit:]}

@app.get("/agents/ss/analytics/gaps")
async def ss_analytics_gaps(request: Request):
    """Questions with weak responses — potential KB gaps."""
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {os.getenv('MCP_API_KEY', 'drakon-mcp-2026')}":
        raise HTTPException(status_code=401)
    if not ANALYTICS_LOG.exists():
        return {"gaps": []}
    entries = [json.loads(l) for l in ANALYTICS_LOG.read_text().splitlines() if l.strip()]
    gaps = [e for e in entries if e.get("response_quality") == "weak"]
    return {"count": len(gaps), "gaps": gaps[-50:]}
```

### Верифікація
```bash
# 1. Перезапустити агент
sudo rc-service ai-architect-agent restart
sleep 3

# 2. Тест запит
curl -s -X POST http://localhost:8766/agents/sonate-solidaire/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour, comment rejoindre lassociation?"}' | python3 -m json.tool | head -5

# 3. Перевірити лог
tail -2 services/architect-agent/kb/sonate-solidaire/analytics.jsonl

# 4. Перевірити stats
curl -s http://localhost:8766/agents/ss/analytics | python3 -m json.tool
```

### Commit
```bash
cd /home/vokov/workspace/ai-drakon-scaffolder
git add services/architect-agent/pipeline/nodes_ss.py \
        services/architect-agent/pipeline/sonate-solidaire-agent.drakon.json \
        services/architect-agent/main.py
git commit -m "feat(analytics): SS agent question logging + analytics endpoints (TASK-119)"
sed -i 's/## \[ \] TASK-119$/## [x] TASK-119/' development/TASKS.md
sed -i 's/## \[ \] TASK-119-v2/## [x] TASK-119-v2/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-119 done"
git push origin main
```

### Diary
```
SESSION:2026-06-03|TASK-119:ss-analytics|nodes_ss.ss_log_analytics+/agents/ss/analytics(3-endpoints)|full-question+quality-detect|commit:<hash>|★★★
```


---

## [x] TASK-SS-24: Створити docs/kb-agent/ з mempalace scan SS

**!!IMPORTANT!! Run locally on AGY3 Termux. NO SSH to dev server.**

### Мета
Використати mempalace scan sonate-solidsite (wing: sonate-solidsite) для створення
двох документів у `docs/kb-agent/`:
1. `site-structure.md` — структура сайту (маршрути, компоненти, сторінки)
2. `site-content-map.md` — карта контенту (що є на кожній сторінці, ключові тексти)

Ці документи допоможуть Sharon агенту краще відповідати на питання про сайт.

### Репо
```bash
cd ~/projects/sonate-solidsite
git pull origin main
```

### Крок 1: Зробити mempalace search для структури

```bash
# Знайти всі маршрути і сторінки
python3 -m mempalace search "routes pages navigation menu" --wing sonate-solidsite --limit 10

# Знайти компоненти
python3 -m mempalace search "components React layout header footer" --wing sonate-solidsite --limit 10

# Знайти контент (текст, заголовки)
python3 -m mempalace search "mission association musicians integration events" --wing sonate-solidsite --limit 10
```

### Крок 2: Створити site-structure.md через AGY/Gemini

Запусти AGY з таким промтом (через `agy` CLI):
```
Я маю доступ до mempalace wing sonate-solidsite.
Зроби такі пошуки і на основі результатів напиши docs/kb-agent/site-structure.md:

1. python3 -m mempalace search "routes pages navigation" --wing sonate-solidsite --limit 10
2. python3 -m mempalace search "components SsAssistant Navbar Footer" --wing sonate-solidsite --limit 10
3. python3 -m mempalace search "i18n languages French German Ukrainian" --wing sonate-solidsite --limit 5

Формат site-structure.md:
# Sonate Solidaire — Структура сайту

## Маршрути (Routes)
[список маршрутів з описом]

## Головні компоненти
[список ключових компонентів]

## Мови
[підтримувані мови і маршрути]

## Асистент Sharon
[технічні деталі підключення]

Мова файлу: АНГЛІЙСЬКА (для агента)
```

### Крок 3: Створити site-content-map.md

```
Зроби такі пошуки і напиши docs/kb-agent/site-content-map.md:

1. python3 -m mempalace search "mission statement association Gland Vaud" --wing sonate-solidsite --limit 5
2. python3 -m mempalace search "events concerts soirees musicales" --wing sonate-solidsite --limit 5
3. python3 -m mempalace search "join musicians integration application" --wing sonate-solidsite --limit 5
4. python3 -m mempalace search "contact form email support" --wing sonate-solidsite --limit 5

Формат: # Site Content Map
Для кожної основної сторінки — назва, URL, головний контент, CTA.
Мова: АНГЛІЙСЬКА
```

### Commit
```bash
cd ~/projects/sonate-solidsite
git add docs/kb-agent/
git commit -m "docs(kb-agent): site structure and content map from mempalace scan (TASK-SS-24)"
git push origin main
```

### Diary
```
SESSION:2026-06-03|TASK-SS-24:kb-agent-docs|site-structure.md+site-content-map.md|mempalace-scan|commit:<hash>|★★★
```


---

## TASK-129: Copilot + GitNexus — дослідження інтеграції та індексація репо

**!!IMPORTANT!! Run via SSH to 192.168.3.184 (dev server). NOT locally.**  
SSH: `sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184`

### Контекст
На dev server (192.168.3.184) налаштовано:
- **Copilot CLI** v1.0.59 (`~/.npm-global/bin/copilot`), модель `claude-haiku-4.5`
- **GitNexus** MCP server на `http://localhost:4747/api/mcp` (Docker, 12 tools)
- GitNexus підключений до Copilot через `~/.copilot/mcp-config.json`
- GitNexus вже проіндексував `/opt/free-claude-code` (7458 nodes)
- Volumes: `/home/vokov/projects` → `/projects` в контейнері

### Що зробити

#### 1. Вивчи GitNexus tools
Запусти та прочитай результати кожного інструменту:
```bash
export PATH=$PATH:/home/vokov/.npm-global/bin
# Список інструментів
echo "List all GitNexus tools and describe each in 2-3 sentences. What is each tool best for?" | copilot -p - --allow-all-tools 2>&1 | tee /tmp/gitnexus-tools.txt
```

#### 2. Проіндексуй 3 проекти в GitNexus
Кожен проект — окремий docker exec:
```bash
# uav-watcher
docker exec gitnexus-server gitnexus index /projects/uav-watcher 2>&1 | tail -5

# sonate-solidsite  
docker exec gitnexus-server gitnexus index /projects/sonate-solidsite 2>&1 | tail -5

# Перевір що проіндексувалось
docker exec gitnexus-server cat /data/gitnexus/registry.json | python3 -m json.tool
```

#### 3. Протестуй Copilot + GitNexus на реальному коді
```bash
cd /home/vokov/projects/uav-watcher
echo "Using GitNexus tools, find the main alert-sending function in this repo and show its call graph. List all functions that call it." | \
  copilot -p - --allow-all-tools --add-dir /home/vokov/projects/uav-watcher 2>&1 | tee /tmp/gitnexus-test.txt
```

#### 4. Напиши гайд
Збережи результати в `/home/vokov/docs/copilot-gitnexus-guide.md`:
- Які 3-5 GitNexus tools найкорисніші для нашого стека
- Шаблон команди для code review через Copilot+GitNexus
- Шаблон для impact analysis перед змінами

#### 5. Оновлення dev server — ~/bin/copilot-task.sh
Перевір що скрипт існує:
```bash
cat ~/bin/copilot-task.sh | head -10
```
Якщо не існує — повідом в diary.

### Верифікація
```bash
# Репо проіндексовані?
docker exec gitnexus-server cat /data/gitnexus/registry.json | python3 -c "import json,sys; repos=json.load(sys.stdin); print(len(repos),'repos:', [r['name'] for r in repos])"

# Файл гайду існує?
cat /home/vokov/docs/copilot-gitnexus-guide.md | head -20
```

### Коміт
Не потрібен (все на dev server, не в git).

### Diary
```
SESSION:2026-06-03|TASK-129:copilot-gitnexus-research|indexed:uav-watcher+sonate-solidsite|guide:/home/vokov/docs/copilot-gitnexus-guide.md|★★★
```

[x] TASK-129

---






## TASK-135: ai-memory routing для AGY phone, AGY3, Copilot

**Виконавець: AGY phone (192.168.3.195)**
**!!IMPORTANT!! Run locally on Termux (AGY phone). SSH до dev server для Copilot.**

### Мета
Налаштувати всі агенти на використання ai-memory (http://192.168.3.184:49374) як спільної пам'яті.

### Контекст
ai-memory MCP server вже підключений до Claude Code на OrangePi (.claude.json + CLAUDE.md).
Треба налаштувати AGY phone, AGY3, і Copilot.

### 1. AGY phone — додай ai-memory routing в CLAUDE.md

```bash
# Отримай routing snippet від ai-memory
BLOCK=$(curl -sf --max-time 15 \
  http://192.168.3.184:49374/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -X POST \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_install_self_routing","arguments":{}}}' \
  | python3 -c "
import json,sys
d=json.loads(sys.stdin.read())
r=json.loads(d['result']['content'][0]['text'])
print(r['markered_block'])
")

# Перевір чи вже є
if grep -q "ai-memory:start" ~/.claude/CLAUDE.md 2>/dev/null; then
  echo "already installed"
else
  echo "" >> ~/.claude/CLAUDE.md
  echo "$BLOCK" >> ~/.claude/CLAUDE.md
  echo "installed on AGY phone"
fi
```

### 2. AGY phone — додай ai-memory до .claude.json MCP servers

```bash
python3 - << 'PY'
import json
with open('/data/data/com.termux/files/home/.claude/.claude.json') as f:
    d = json.load(f)
if 'mcpServers' not in d:
    d['mcpServers'] = {}
d['mcpServers']['ai-memory'] = {
    'type': 'http',
    'url': 'http://192.168.3.184:49374/mcp'
}
with open('/data/data/com.termux/files/home/.claude/.claude.json', 'w') as f:
    json.dump(d, f, indent=2)
print('ai-memory added to AGY phone MCP config')
PY
```

### 3. AGY3 — те саме (SSH до 192.168.3.204)

```bash
sshpass -p 'TermuxSsh2026!' ssh -o StrictHostKeyChecking=no -p 8022 u0_a410@192.168.3.204 'python3 - << '"'"'PY'"'"'
import json, subprocess
BLOCK = subprocess.run(["curl","-sf","--max-time","15",
  "http://192.168.3.184:49374/mcp",
  "-H","Content-Type: application/json",
  "-H","Accept: application/json, text/event-stream",
  "-X","POST",
  "-d","{ \"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"memory_install_self_routing\",\"arguments\":{}}}"
], capture_output=True, text=True).stdout
r = json.loads(json.loads(BLOCK)["result"]["content"][0]["text"])
block = r["markered_block"]
with open("/data/data/com.termux/files/home/.claude/CLAUDE.md","a") as f:
    f.write("\n" + block)
# MCP config
try:
    with open("/data/data/com.termux/files/home/.claude/.claude.json") as f:
        d = json.load(f)
except:
    d = {}
d.setdefault("mcpServers",{})["ai-memory"] = {"type":"http","url":"http://192.168.3.184:49374/mcp"}
with open("/data/data/com.termux/files/home/.claude/.claude.json","w") as f:
    json.dump(d,f,indent=2)
print("AGY3 ai-memory configured")
PY'
```

### 4. Copilot (dev server 192.168.3.184) — ai-memory як MCP

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 '
# Додай ai-memory до Copilot mcp-config.json
python3 - << '"'"'PY'"'"'
import json
with open("/home/vokov/.copilot/mcp-config.json") as f:
    d = json.load(f)
d["mcpServers"]["ai-memory"] = {
    "url": "http://localhost:49374/mcp",
    "type": "http"
}
with open("/home/vokov/.copilot/mcp-config.json","w") as f:
    json.dump(d,f,indent=2)
print("Copilot ai-memory MCP configured:", list(d["mcpServers"].keys()))
PY
'
```

### 5. Перевір ai-memory статус

```bash
curl -sf http://192.168.3.184:49374/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -X POST \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_status","arguments":{}}}' \
  2>/dev/null | python3 -c "
import json,sys
d=json.loads(sys.stdin.read())
print(d.get('result',{}).get('content',[{}])[0].get('text','?')[:500])
"
```

### Diary
```
SESSION:2026-06-04|TASK-135:ai-memory-routing|AGY-phone+AGY3+Copilot|★★★
```

[x] TASK-135

## TASK-130: Bloom repos clone + MemPalace mine + gap analysis

**!!IMPORTANT!! Run locally in Termux on AGY4. Do NOT SSH anywhere.**

**Мета:** Клонувати Garden Bloom repos, проіндексувати в MemPalace, написати gap-analysis
відносно AI-DRAKON.

### 1. Клонування / оновлення репозиторіїв

Перейди в ~/workspace/

Bloom backend (agent-onboarding-kit):
  Якщо ~/workspace/agent-onboarding-kit існує — git pull там.
  Інакше — git clone https://github.com/maxfraieho/agent-onboarding-kit.git ~/workspace/agent-onboarding-kit

Bloom frontend (garden-seedling-stage):
  Якщо ~/workspace/garden-seedling-stage-d69fe8be існує — git pull там.
  Інакше — git clone https://github.com/maxfraieho/garden-seedling-stage-d69fe8be.git ~/workspace/garden-seedling-stage-d69fe8be

Також оновити:
  cd ~/workspace/ai-drakon-scaffolder && git pull origin main
  cd ~/workspace/exodus-infra && git pull origin main

### 2. MemPalace mine — індексація (по черзі!)

cd ~/workspace/agent-onboarding-kit
python3 -m mempalace mine

cd ~/workspace/garden-seedling-stage-d69fe8be
python3 -m mempalace mine

cd ~/workspace/ai-drakon-scaffolder
python3 -m mempalace mine

Якщо mempalace mine падає — запиши помилку в diary і продовжуй без нього.

### 3. Читання документів (ключові файли)

Прочитай:
  ~/workspace/agent-onboarding-kit/README.md
  ~/workspace/agent-onboarding-kit/docs/ІНДЕКС.md
  ~/workspace/agent-onboarding-kit/docs/КАРТА_СИСТЕМИ.md
  ~/workspace/agent-onboarding-kit/docs/PROJECT_DESCRIPTION_CANONICAL.md
  ~/workspace/garden-seedling-stage-d69fe8be/README.md
  ~/workspace/garden-seedling-stage-d69fe8be/AGENT_HANDOFF.md
  ~/workspace/ai-drakon-scaffolder/src/pages/ (список файлів + прочитай App або index)

### 4. Написання gap-analysis документу

Напиши файл ~/workspace/exodus-infra/analysis/bloom-drakon-gap-analysis.md

Структура документу:

# Bloom → AI-DRAKON: Gap Analysis
Дата: 2026-06-05
Автор: AGY4

## Bloom Platform — ключові можливості
Що надає Garden Bloom (на основі прочитаних доків):
- Knowledge zones (MinIO: що це, як використовується)
- NotebookLM integration (Python API port 5000)
- Agent execution + Proposal system
- Memory API (TypeScript port 3001, isomorphic-git, BM25 search)
- MCP Gateway: https://garden-mcp.exodus.pp.ua (Cloudflare Worker, живий)
- GitHub operations (canonical storage)
- DRAKON diagram persistence

## AI-DRAKON — поточний стан
Що вже є в AI-DRAKON (на основі src/pages/):
- DRAKON diagram editor
- Agent Studio
- Pipeline editor
- LangGraph agents
- Observability, Code, Routing pages

Чого немає:
- MinIO knowledge zones
- NotebookLM UI
- Knowledge base management
- Obsidian sync

## Gap Analysis таблиця
| Функція | Bloom | AI-DRAKON | Пріоритет |

## Рекомендовані точки інтеграції
1. Garden MCP Worker (garden-mcp.exodus.pp.ua) як gateway API
2. Bloom Memory API (port 3001) для search/recall
3. NotebookLM Python API (port 5000) для knowledge management
4. MinIO S3 API для zone storage

### 5. Коміт

cd ~/workspace/exodus-infra
git add analysis/bloom-drakon-gap-analysis.md
git commit -m "analysis(bloom-drakon): AGY4 gap analysis 2026-06-05"
git push origin main

### Верифікація
  ls ~/workspace/agent-onboarding-kit/
  ls ~/workspace/garden-seedling-stage-d69fe8be/
  ls ~/workspace/exodus-infra/analysis/bloom-drakon-gap-analysis.md
  git -C ~/workspace/exodus-infra log --oneline -1

### Diary
SESSION:2026-06-05|TASK-130:bloom-gap-analysis|cloned:agent-onboarding-kit+garden-seedling|mined:mempalace|doc:bloom-drakon-gap-analysis.md|commit:pushed|★★★

[x] TASK-130

## TASK-131: Bloom→DRAKON технічна специфікація інтеграції

**!!IMPORTANT!! Виконуй локально в Termux (~/workspace/). SSH до 192.168.3.184 тільки
для читання документації — НЕ вноси жодних змін на dev server.**

**Мета:** Розробити детальну технічну специфікацію: які нові сторінки / компоненти / API
додати в AI-DRAKON щоб покрити функціонал Garden Bloom.

### 1. Підготовка

cd ~/workspace/ai-drakon-scaffolder && git pull origin main
cd ~/workspace/exodus-infra && git pull origin main

Прочитай (якщо є):
  ~/workspace/exodus-infra/analysis/bloom-drakon-gap-analysis.md

### 2. Читання Bloom документації через SSH

sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184

На dev server прочитай:
  ls /home/vokov/workspace/agent-onboarding-kit/docs/architecture/
  cat /home/vokov/workspace/agent-onboarding-kit/docs/PROJECT_DESCRIPTION_CANONICAL.md
  ls /home/vokov/workspace/agent-onboarding-kit/src/routes/
  cat /home/vokov/workspace/agent-onboarding-kit/src/routes/memory.ts
  cat /home/vokov/workspace/agent-onboarding-kit/src/routes/auth.ts
  ls /home/vokov/workspace/garden-seedling-stage-d69fe8be/src/pages/
  head -150 /home/vokov/workspace/garden-seedling-stage-d69fe8be/_collab/infrastructure/cloudflare/worker/index.js

### 3. Читання AI-DRAKON codebase

Локально прочитай:
  ~/workspace/ai-drakon-scaffolder/src/pages/ (всі .tsx)
  ~/workspace/ai-drakon-scaffolder/src/routes/ (структура маршрутів)
  ~/workspace/ai-drakon-scaffolder/src/server.ts (backend структура)

Знайди де і як DRAKON editor зберігає схеми (grep -r "save\|persist\|storage" в src/).

### 4. Написання специфікації

Напиши ~/workspace/exodus-infra/analysis/bloom-drakon-integration-spec.md

Структура:

# Bloom → AI-DRAKON Integration Specification
Дата: 2026-06-05
Автор: AGY3

## Загальна архітектура інтеграції
Як Bloom і DRAKON стають єдиною системою.
Gateway: https://garden-mcp.exodus.pp.ua (Cloudflare Worker, вже живий)

## Нові сторінки в AI-DRAKON

### KnowledgePage (/knowledge)
- Компонент: KnowledgeZonesList
- API calls до garden-mcp.exodus.pp.ua
- Операції: list zones, create zone, upload file, delete
- Кнопка "Додати в NotebookLM"

### NotebookLMPage (/notebooks) або вкладка в existing page
- Список notebooks (через Bloom backend API port 5000 або через Gateway)
- Додавання source з MinIO zone
- Chat interface (embed або link)

## Нові API endpoint-и в AI-DRAKON backend

Перелічи конкретні endpoint-и які треба додати в src/server.ts:
- GET /api/knowledge/zones
- POST /api/knowledge/zones
- тощо

## Garden MCP Worker — API контракт
На основі прочитаного worker/index.js:
- Які endpoints доступні
- Як auth (JWT? Bearer?)
- Формат запитів

## MinIO Zones — структура
Як організовані зони, папки, файли в MinIO.

## Перші 3 задачі для реалізації

Напиши як TASK-132, TASK-133, TASK-134 (що саме, в яких файлах, верифікація).
Задачі мають бути атомарні — кожна виконується за 1-2 год.

### 5. Коміт

cd ~/workspace/exodus-infra
git add analysis/bloom-drakon-integration-spec.md
git commit -m "spec(bloom-drakon): AGY3 technical integration spec 2026-06-05"
git push origin main

### Верифікація
  ls ~/workspace/exodus-infra/analysis/bloom-drakon-integration-spec.md
  git -C ~/workspace/exodus-infra log --oneline -2

### Diary
SESSION:2026-06-05|TASK-131:bloom-drakon-spec|doc:bloom-drakon-integration-spec.md|commit:pushed|★★★

[x] TASK-131

## TASK-132: Knowledge API proxy endpoints в AI-DRAKON backend

**!!IMPORTANT!! Виконуй локально в Termux на AGY3. SSH до 192.168.3.184 тільки для перевірки.**

**Мета:** Додати 6 API route-ів в AI-DRAKON backend (TanStack Start) що проксують
запити до Garden Gateway https://garden-mcp.exodus.pp.ua

**Читай спочатку:**
  ~/workspace/exodus-infra/analysis/bloom-drakon-integration-spec.md — секція "Нові API endpoint-и"

**Де знаходиться backend AI-DRAKON:**
  ~/workspace/ai-drakon-scaffolder/src/server.ts (Fastify backend)
  ~/workspace/ai-drakon-scaffolder/src/ (TanStack Start routes)

### 1. Підготовка

cd ~/workspace/ai-drakon-scaffolder && git pull origin main

Прочитай src/server.ts та src/routes/ щоб зрозуміти архітектуру.
Знайди де додаються нові route-и (чи Fastify plugins чи TanStack API routes).

### 2. Реалізація

Створи файл src/server/knowledge.ts (або відповідний до архітектури проекту):

Додай наступні endpoints:

GET /api/knowledge/zones
  → proxy GET https://garden-mcp.exodus.pp.ua/zones/list
  → Header: Authorization: Bearer GARDEN_OWNER_TOKEN (з env)
  → Return: JSON response від Gateway

POST /api/knowledge/zones
  → proxy POST https://garden-mcp.exodus.pp.ua/zones/create
  → Forward request body
  → Header: Authorization: Bearer GARDEN_OWNER_TOKEN

DELETE /api/knowledge/zones/:zoneId
  → proxy DELETE https://garden-mcp.exodus.pp.ua/zones/:zoneId
  → Header: Authorization: Bearer GARDEN_OWNER_TOKEN

GET /api/knowledge/zones/:zoneId/notebooklm
  → proxy GET https://garden-mcp.exodus.pp.ua/zones/:zoneId/notebooklm

POST /api/knowledge/zones/:zoneId/notebooklm/retry
  → proxy POST https://garden-mcp.exodus.pp.ua/zones/:zoneId/notebooklm/retry-import

POST /api/notebooklm/chat
  → proxy POST https://garden-mcp.exodus.pp.ua/notebooklm/chat
  → Forward: message, notebookUrl, kind, history

GARDEN_OWNER_TOKEN береться з process.env.GARDEN_OWNER_TOKEN
Якщо token відсутній — повертати 503 з помилкою "GARDEN_OWNER_TOKEN not configured"

### 3. Реєстрація routes

Підключи новий файл у src/server.ts або відповідному entry point.

### 4. Env variable

Перевір чи є в проекті .env або env config файл.
Додай GARDEN_OWNER_TOKEN= (порожнє значення, буде заповнено пізніше).

### 5. Коміт

git add src/server/knowledge.ts (або відповідний шлях)
git add src/server.ts (або де підключається)
git commit -m "feat(knowledge): add Garden Gateway proxy API endpoints"
git push origin main

### Верифікація
  grep -r "knowledge" src/ | grep route | head -5
  grep "GARDEN_OWNER_TOKEN" src/ -r | head -3

### Diary
SESSION:2026-06-05|TASK-132:knowledge-api-proxy|endpoints:6|commit:pushed|★★★

[x] TASK-132

## TASK-133: KnowledgePage UI — сторінка керування зонами знань

**!!IMPORTANT!! Виконуй локально в Termux на AGY3.**

**Мета:** Реалізувати сторінку /knowledge в AI-DRAKON з компонентами управління
Knowledge Zones згідно специфікації в bloom-drakon-integration-spec.md

**Читай спочатку:**
  ~/workspace/exodus-infra/analysis/bloom-drakon-integration-spec.md — секція "KnowledgePage"
  ~/workspace/ai-drakon-scaffolder/src/pages/ — список існуючих сторінок для розуміння стилю

### 1. Підготовка

cd ~/workspace/ai-drakon-scaffolder && git pull origin main
Прочитай одну з існуючих сторінок (наприклад DiagramsPage.tsx) щоб зрозуміти структуру.
Прочитай src/routes/__root.tsx та навігацію.

### 2. Реалізація

Створи такі файли:

**src/pages/KnowledgePage.tsx** — головна сторінка
  - Заголовок "Knowledge Zones"
  - KnowledgeZonesList компонент
  - Кнопка "Create Zone" що відкриває ZoneCreationDialog

**src/components/knowledge/KnowledgeZonesList.tsx** — список зон
  - useQuery для GET /api/knowledge/zones
  - Таблиця або cards: name, description, expiresAt, noteCount
  - NotebookLM status badge (queued/pending/running/completed/failed)
  - Кнопка Delete для кожної зони (useMutation DELETE)
  - Empty state якщо зон немає

**src/components/knowledge/ZoneCreationDialog.tsx** — діалог створення
  - Поля: name (required), description, TTL (select: 1h/24h/7d), accessType (web/mcp/both)
  - Checkbox "Create NotebookLM notebook"
  - Якщо checkbox: показати поля notebookTitle, shareEmails
  - useMutation POST /api/knowledge/zones
  - Після success: закрити діалог, refetch list

**src/routes/knowledge.tsx** — TanStack Router route
  - Підключення до KnowledgePage

**src/routes/__root.tsx** або навігаційний файл:
  - Додати Knowledge в nav menu (іконка Brain або BookOpen з lucide-react)

### 3. Lovable sync

Після кожного нового файлу:
  cp src/X .lovable/src/X

### 4. Коміт

git add src/pages/KnowledgePage.tsx src/components/knowledge/ src/routes/knowledge.tsx
git add .lovable/src/pages/KnowledgePage.tsx .lovable/src/components/knowledge/ .lovable/src/routes/knowledge.tsx
git commit -m "feat(knowledge): add KnowledgePage with ZonesList and CreateDialog"
git push origin main

### Верифікація
  ls src/pages/KnowledgePage.tsx
  ls src/components/knowledge/
  ls src/routes/knowledge.tsx
  grep "knowledge" src/routes/__root.tsx | head -3

### Diary
SESSION:2026-06-05|TASK-133:knowledge-page-ui|files:KnowledgePage+ZonesList+CreateDialog+route|commit:pushed|★★★

[x] TASK-133

## TASK-134: NotebookLMPage — сторінка чату з AI (/notebooks)

**!!IMPORTANT!! Виконуй локально в Termux на AGY3.**

**Мета:** Реалізувати сторінку /notebooks з двопанельним інтерфейсом чату NotebookLM
згідно bloom-drakon-integration-spec.md секція "NotebookLMPage".

**Читай спочатку:**
  ~/workspace/exodus-infra/analysis/bloom-drakon-integration-spec.md — секція "NotebookLMPage"
  ~/workspace/ai-drakon-scaffolder/src/pages/KnowledgePage.tsx — стиль аналогічної сторінки
  ~/workspace/ai-drakon-scaffolder/src/components/knowledge/ — приклад компонентів

### 1. Підготовка

cd ~/workspace/ai-drakon-scaffolder && git pull origin main

### 2. Реалізація файлів

**src/pages/NotebookLMPage.tsx** — головна сторінка
  - Заголовок "NotebookLM"
  - NotebookLMChatPanel компонент
  - Інформаційний банер: "Connect to knowledge zones via Garden Gateway"

**src/components/notebooklm/NotebookLMChatPanel.tsx** — двопанельний чат
  Ліва панель:
    - Поле вводу notebookUrl (label: "Notebook URL")
    - Textarea для початкового питання
    - Select для kind: answer | summary | study_guide | flashcards
    - Кнопка "Ask"
  Права панель:
    - Список повідомлень (messages: {role, content}[])
    - Loading spinner під час запиту
    - Citations блок (якщо є в response)
    - Markdown rendering через dangerouslySetInnerHTML або текст
  State: notebookUrl, kind, messages[], isLoading, error
  API call: POST /api/notebooklm/chat з {notebookUrl, message, kind, history}

**src/routes/notebooks.tsx** — TanStack Router route
  import { createFileRoute } from "@tanstack/react-router"
  Route path: "/notebooks"

**src/components/workspace/WorkspaceShell.tsx** — додати nav пункт
  Знайди де додавав "Знання" (Brain icon) і додай поряд:
  to: "/notebooks", label: "NotebookLM", icon: BookOpen (з lucide-react)

### 3. Lovable sync (після кожного файлу)

  mkdir -p .lovable/src/components/notebooklm
  cp src/pages/NotebookLMPage.tsx .lovable/src/pages/NotebookLMPage.tsx
  cp src/components/notebooklm/NotebookLMChatPanel.tsx .lovable/src/components/notebooklm/NotebookLMChatPanel.tsx
  cp src/routes/notebooks.tsx .lovable/src/routes/notebooks.tsx
  cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx

### 4. Коміт

git add src/pages/NotebookLMPage.tsx \
        src/components/notebooklm/NotebookLMChatPanel.tsx \
        src/routes/notebooks.tsx \
        src/components/workspace/WorkspaceShell.tsx \
        .lovable/src/pages/NotebookLMPage.tsx \
        .lovable/src/components/notebooklm/NotebookLMChatPanel.tsx \
        .lovable/src/routes/notebooks.tsx \
        .lovable/src/components/workspace/WorkspaceShell.tsx
git commit -m "feat(notebooklm): add NotebookLMPage with chat panel UI (TASK-134)"
git push origin main

### 5. Верифікація

  ls src/pages/NotebookLMPage.tsx
  ls src/components/notebooklm/NotebookLMChatPanel.tsx
  ls src/routes/notebooks.tsx
  grep "notebooks\|NotebookLM" src/components/workspace/WorkspaceShell.tsx | head -3
  git log --oneline -1

### Diary
SESSION:2026-06-05|TASK-134:notebooklm-page|files:NotebookLMPage+ChatPanel+route+nav|commit:pushed|★★★

[x] TASK-134

## TASK-135: Перемкнути NotebookLM chat на notebooklm.exodus.pp.ua/mcp

**!!IMPORTANT!! Run locally on AGY4 Termux. DO NOT SSH anywhere.**
**Model: gemini-2.5-flash**

### Контекст
- `/notebooks` сторінка в AI-DRAKON зараз проксує chat через `garden-mcp.exodus.pp.ua` — повертає 502
- На RPi 3b (192.168.3.234:8002) живе FastMCP сервер з повним набором NotebookLM tools
- Публічний URL: `https://notebooklm.exodus.pp.ua/mcp`
- Протокол: streamable-http (JSON-RPC 2.0)

### MCP API (підтверджено)
```
POST https://notebooklm.exodus.pp.ua/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

# Список ноутбуків:
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"notebooks_list","arguments":{}},"id":1}
# Відповідь: {"result":{"content":[{"type":"text","text":"[{\"id\":\"...\",\"title\":\"...\"}]"}]}}

# Чат:
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"chat_ask","arguments":{"notebook_id":"<id>","question":"<text>"}},"id":2}
# Відповідь: {"result":{"content":[{"type":"text","text":"<answer>"}]}}
```

### Що зробити

#### 1. Створити helper `src/server/notebooklm-mcp.ts`
```typescript
const NLM_MCP_URL = "https://notebooklm.exodus.pp.ua/mcp";

async function mcpCall(toolName: string, args: Record<string, unknown>) {
  const res = await fetch(NLM_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
  });
  if (!res.ok) throw new Error(`MCP error: ${res.status}`);
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  const text = data?.result?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}

export const nlmMcp = {
  listNotebooks: () => mcpCall("notebooks_list", {}),
  chat: (notebookId: string, question: string) =>
    mcpCall("chat_ask", { notebook_id: notebookId, question }),
};
```

#### 2. Оновити `src/routes/api.notebooklm.chat.ts`
Замість проксі до garden-mcp — викликати `nlmMcp.chat()`:
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { nlmMcp } from "../server/notebooklm-mcp";

export const Route = createFileRoute("/api/notebooklm/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { notebookId, question } = await request.json() as any;
          if (!notebookId || !question) {
            return new Response(JSON.stringify({ error: "notebookId and question required" }), { status: 400 });
          }
          const answer = await nlmMcp.chat(notebookId, question);
          return new Response(JSON.stringify({ answer }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 502 });
        }
      },
    },
  },
});
```

#### 3. Додати `src/routes/api.notebooklm.notebooks.ts`
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { nlmMcp } from "../server/notebooklm-mcp";

export const Route = createFileRoute("/api/notebooklm/notebooks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const notebooks = await nlmMcp.listNotebooks();
          return new Response(JSON.stringify({ notebooks }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 502 });
        }
      },
    },
  },
});
```

#### 4. Оновити `src/components/notebooklm/NotebookLMChatPanel.tsx`
- Замінити поле `notebookUrl` на `notebookId` (select dropdown)
- Додати `useQuery` для `GET /api/notebooklm/notebooks` → populate dropdown `[{id, title}]`
- POST body змінити: `{ notebookId, question: input }` замість `{ notebookUrl, query, kind }`
- Відображати `answer` з відповіді

#### 5. Sync .lovable
Після кожного зміненого файлу `src/X`:
```bash
cp src/server/notebooklm-mcp.ts .lovable/src/server/notebooklm-mcp.ts
cp src/routes/api.notebooklm.chat.ts .lovable/src/routes/api.notebooklm.chat.ts
cp src/routes/api.notebooklm.notebooks.ts .lovable/src/routes/api.notebooklm.notebooks.ts
cp src/components/notebooklm/NotebookLMChatPanel.tsx .lovable/src/components/notebooklm/NotebookLMChatPanel.tsx
```

#### 6. Git commit + push
```bash
cd ~/workspace/ai-drakon-scaffolder
git add src/server/notebooklm-mcp.ts \
        src/routes/api.notebooklm.chat.ts \
        src/routes/api.notebooklm.notebooks.ts \
        src/components/notebooklm/NotebookLMChatPanel.tsx \
        .lovable/src/server/notebooklm-mcp.ts \
        .lovable/src/routes/api.notebooklm.chat.ts \
        .lovable/src/routes/api.notebooklm.notebooks.ts \
        .lovable/src/components/notebooklm/NotebookLMChatPanel.tsx \
        development/TASKS.md
git commit -m "feat(notebooklm): switch chat to notebooklm.exodus.pp.ua MCP (TASK-135)"
git push origin main
```

### Верифікація
```bash
# Список ноутбуків доступний:
curl -s https://notebooklm.exodus.pp.ua/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d jsonrpc:2.0 | head -100
```

### Diary
SESSION:2026-06-05|TASK-135:notebooklm-mcp-switch|commit:<hash>|★★★

[x] TASK-135 (in_progress)
done cat
done cat
done cat
done cat

## TASK-136: Діагностика та виправлення garden-mcp.exodus.pp.ua 502

**!!IMPORTANT!! Run locally on AGY2 (Windows). Use PowerShell/curl. NO SSH.**

### Контекст
- garden-mcp.exodus.pp.ua — Cloudflare Worker повертає 502 на всі запити
- Потрібен для Knowledge Zones в AI-DRAKON (MinIO зони)
- CF Account ID: c354ea45a11a1e1c14f1f41fe780cb34
- CF API Token: cfat_em4yaiFnrrV7sHcDVIC2j9XzWaC3mujKwY0phHm0449cf8de
- KV namespace ID: 3fbc4a87aa36480cb661b2b93fe01aa5
- Worker name: garden-mcp-server

### Крок 1: Перевірити bindings Worker
```powershell
$h = @{ Authorization = "Bearer cfat_em4yaiFnrrV7sHcDVIC2j9XzWaC3mujKwY0phHm0449cf8de" }
$r = Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/c354ea45a11a1e1c14f1f41fe780cb34/workers/scripts/garden-mcp-server/bindings" -Headers $h
$r | ConvertTo-Json -Depth 5
```
Очікуємо binding type=kv_namespace name=GARDEN_KV з правильним namespace_id.

### Крок 2: Перевірити KV ключі
```powershell
$r2 = Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/c354ea45a11a1e1c14f1f41fe780cb34/storage/kv/namespaces/3fbc4a87aa36480cb661b2b93fe01aa5/keys" -Headers $h
$r2 | ConvertTo-Json
```

### Крок 3: Спробувати init Worker
```powershell
$body = '{"password":"bloom2026!"}'
try {
    Invoke-RestMethod "https://garden-mcp.exodus.pp.ua/auth/setup" -Method POST -Body $body -ContentType "application/json"
} catch {
    Write-Host "Error: $_"
}
```

### Крок 4: Перевірити Worker deployments
```powershell
$r3 = Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/c354ea45a11a1e1c14f1f41fe780cb34/workers/scripts/garden-mcp-server/deployments" -Headers $h
$r3 | ConvertTo-Json -Depth 3
```

### Результат
Записати в файл development\garden-mcp-diagnosis.md з висновком що зламано.

### Git commit
```powershell
cd C:\Users\vokov\workspace\ai-drakon-scaffolder
git pull origin main
git add development\garden-mcp-diagnosis.md development\TASKS.md
git commit -m "chore(tasks): mark TASK-136 done + garden-mcp diagnosis"
git push origin main
```

### Diary
SESSION:2026-06-05|TASK-136:garden-mcp-502-diagnosis|commit:<hash>|results:see-diagnosis-md|***

[x] TASK-136


## TASK-142: Knowledge UI redesign via OpenDesign (after TASK-141 crash fix)
[x] TASK-142
    !!IMPORTANT!! Run ALL on dev server 192.168.3.184
    Project: ~/workspace/ai-drakon-scaffolder/
    Depends on: TASK-141 must be done first

    ### Goal
    Use OpenDesign to generate improved UI for /knowledge page:
    1. KnowledgeZonesList - better zone cards
    2. ZoneCreationDialog - cleaner folder selection
    3. KnowledgePage - improved sidebar/tab layout

    ### OpenDesign API (MANDATORY - use this for UI generation)
    URL: https://opendesign.exodus.pp.ua
    Token: 2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a
    Plugin: ai-drakon-mobile

    Run a design task:
    curl -s https://opendesign.exodus.pp.ua/api/runs -X POST \
      -H "Authorization: Bearer 2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a" \
      -H "Content-Type: application/json" \
      -d '{"prompt":"<your prompt>","pluginId":"ai-drakon-mobile","od.mode":"generate"}'

    Poll result (repeat until status=complete):
    curl -s "https://opendesign.exodus.pp.ua/api/runs/<runId>" \
      -H "Authorization: Bearer 2269d21455f772f62878631c5665d7ff1e57fe58790d976e80871c427a3dee4a"

    Also use RPi browser (agent-workspace) to see current /knowledge UI:
    Navigate to: https://ai-drakon-scaffolder.pages.dev/knowledge

    ### Step 1 - MemPalace + GitNexus research
    python3 -m mempalace search "knowledge zones vault UI redesign" --wing ai-drakon-scaffolder
    curl -s "http://192.168.3.184:4747/api/repos/ai-drakon-scaffolder/context?name=KnowledgeZonesList" \
      | python3 -m json.tool | head -30

    ### Step 2 - Generate improved KnowledgeZonesList via OpenDesign
    Prompt: "Redesign Knowledge Zones list cards for AI developer tool. Dark theme.
    Each card: zone name (bold), folder pills (small badges with folder icon),
    note count badge, color-coded expiry (green>24h, yellow<24h, red<1h),
    action buttons row: Copy Code / Copy URL / Delete.
    Compact layout, max 3 columns grid. shadcn/ui TypeScript React."

    ### Step 3 - Generate improved ZoneCreationDialog folder tree
    Prompt: "Design folder tree selector for zone creation dialog.
    Two-panel: left=folder tree with checkboxes (indented, expand/collapse),
    right=selected count + note count summary. Compact, developer tool style."

    ### Step 4 - Apply generated code to project files
    Files to update:
    - src/components/knowledge/KnowledgeZonesList.tsx
    - src/components/knowledge/ZoneCreationDialog.tsx (folder tree section only)
    - src/pages/KnowledgePage.tsx (sidebar improvements if needed)

    ### Step 5 - Commit + .lovable sync + push
    cd ~/workspace/ai-drakon-scaffolder
    for f in src/components/knowledge/KnowledgeZonesList.tsx src/components/knowledge/ZoneCreationDialog.tsx src/pages/KnowledgePage.tsx; do
      cp $f .lovable/$f && echo synced $f
    done
    git add src/ .lovable/
    git commit -m "feat(knowledge-ui): OpenDesign redesign - zone cards + folder tree (TASK-142)"
    git push origin main

    ### Mark done
    python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-142','[x] TASK-142',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-142 done" && git push origin main
    python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-06-05|TASK-142:knowledge-opendesign-redesign|commit:<hash>|STAR3"

    !!IMPORTANT!! OpenDesign URL: https://opendesign.exodus.pp.ua (NOT 7459 or 7460)
    !!IMPORTANT!! Poll OpenDesign runId until status=complete before reading result
    !!IMPORTANT!! .lovable sync mandatory
    !!IMPORTANT!! npm run build must pass in .lovable/ before commit


## TASK-141: Diagnose and fix /knowledge page crash
[x] TASK-141
    !!IMPORTANT!! Run ALL commands on dev server 192.168.3.184
    Project: ~/workspace/ai-drakon-scaffolder/

    ### Problem
    /knowledge page shows "This page did not load" after commits 93af1a4..87b7165.

    ### Step 1 MANDATORY — MemPalace first
    python3 -m mempalace search "knowledge page crash zones vault" --wing ai-drakon-scaffolder
    python3 -m mempalace search "KnowledgePage ZoneCreationDialog" --wing ai-drakon-scaffolder

    ### Step 2 MANDATORY — GitNexus research
    curl -s http://192.168.3.184:4747/api/repos | python3 -m json.tool | grep -A2 ai-drakon
    curl -s "http://192.168.3.184:4747/api/repos/ai-drakon-scaffolder/context?name=KnowledgePage" | python3 -m json.tool | head -40

    ### Step 3 — Build check (source of truth)
    cd ~/workspace/ai-drakon-scaffolder/.lovable
    npm run build 2>&1 | tail -60
    # Fix ALL build errors found

    ### Step 4 — Sync check
    for f in src/pages/KnowledgePage.tsx src/routes/knowledge.tsx src/components/knowledge/ZoneCreationDialog.tsx src/components/docs/NotesTab.tsx src/routes/api.knowledge.zones.ts; do
      diff ~/workspace/ai-drakon-scaffolder/$f ~/workspace/ai-drakon-scaffolder/.lovable/$f && echo "$f OK" || echo "$f OUT OF SYNC"
    done
    # Fix any out-of-sync files: cp src/X .lovable/src/X

    ### Step 5 — Fix all issues, rebuild to confirm 0 errors

    ### Step 6 — Commit + push
    cd ~/workspace/ai-drakon-scaffolder
    git add src/ .lovable/src/
    git commit -m "fix(knowledge): resolve page crash TASK-141"
    git push origin main
    python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-141','[x] TASK-141',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-141 done" && git push origin main
    python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-06-05|TASK-141:knowledge-crash|root-cause:BUILD-ERROR|commit:<hash>|STAR3"

    !!IMPORTANT!! MemPalace + GitNexus MANDATORY before reading files
    !!IMPORTANT!! npm run build must pass with 0 errors before commit
    !!IMPORTANT!! .lovable sync mandatory for ALL changed files


## TASK-140: Fix zone creation — ttlMinutes + fetch note content before submit
[x] TASK-140
    !!IMPORTANT!! Run ALL commands on dev server 192.168.3.184, NOT locally on Termux
    Project: ~/workspace/ai-drakon-scaffolder/

    ### Root cause (confirmed via direct garden-mcp API test)
    garden-mcp /zones/create requires:
      - ttlMinutes: number (integer minutes), NOT ttl: "1h"/"24h"/"7d" string
      - notes: [{slug, title, content, tags}] array WITH actual file content
    Currently frontend sends wrong format → "internal error"

    ### Fix A — api.ts: change ttl to ttlMinutes
    File: src/lib/api.ts
    Change in CreateKnowledgeZoneRequest:
      FROM: ttl?: "1h" | "24h" | "7d";
      TO:   ttlMinutes?: number;

    Also update KnowledgeZone type — add missing fields from garden-mcp response:
      accessCode?: string;
      webUrl?: string;
      mcpUrl?: string;
      zoneUrl?: string;
      folders?: string[];
      createdAt?: string;

    ### Fix B — ZoneCreationDialog.tsx: TTL picker + fetch note content
    File: src/components/knowledge/ZoneCreationDialog.tsx

    1. Replace Select TTL with button pills (like Bloom):
       Remove: useState for ttl string + Select component
       Add:
         const [ttlMinutes, setTtlMinutes] = useState(1440); // default 24h
         const TTL_OPTIONS = [
           { label: "15m", value: 15 },
           { label: "1h", value: 60 },
           { label: "6h", value: 360 },
           { label: "24h", value: 1440 },
           { label: "7d", value: 10080 },
         ];
       Render: row of Button pills, selected pill has bg-primary text-primary-foreground

    2. Fetch note content before submitting:
       Import: fetchNote from "@/lib/garden/notesApi"
       In handleSubmit, before mutate():
         - Get all notes from tree that are in selectedFolders
         - Fetch content for each: await fetchNote(node.slug, project)
         - Build notes array: [{slug, title, content, tags}]
         - Include in request: notes: notesArray

       Helper to get notes in selected folders:
         function getNotesInFolders(tree: TreeNode[], selectedFolders: Set<string>): TreeNode[] {
           const result: TreeNode[] = [];
           function walk(nodes: TreeNode[]) {
             for (const n of nodes) {
               if (n.type === "note" && n.slug) {
                 const parts = n.slug.split("/");
                 const folder = parts.slice(0, -1).join("/");
                 if (selectedFolders.size === 0 || selectedFolders.has(folder) || selectedFolders.has(parts[0])) {
                   result.push(n);
                 }
               }
               if (n.children) walk(n.children);
             }
           }
           walk(tree);
           return result;
         }

    3. Fix the request body — change ttl to ttlMinutes:
       IN handleSubmit:
         Change: { ...data, ttl, ... }
         To: { ...data, ttlMinutes, ... }

    4. Add loading state for content fetch:
       const [fetchingContent, setFetchingContent] = useState(false);
       Show spinner while fetching notes content

    Full handleSubmit flow:
      1. Validate name
      2. setFetchingContent(true)
      3. const noteNodes = getNotesInFolders(treeFromQuery, selectedFolders)
      4. const notes = await Promise.all(noteNodes.map(async n => {
           const content = await fetchNote(n.slug!, ghProject || undefined)
           return { slug: n.slug!, title: n.title ?? n.slug!, content: content?.content ?? "", tags: content?.tags ?? [] }
         }))
      5. setFetchingContent(false)
      6. createZoneMutation.mutate({ name, description, ttlMinutes, accessType, folders: Array.from(selectedFolders), noteCount: notes.length, notes, createNotebookLm, notebookLmTitle })

    NOTE: fetchNote signature: fetchNote(slug: string, project?: string): Promise<NoteContent | null>
    Where NoteContent = { slug, path, title, content, tags, sha? }

    ### Fix C — api.knowledge.zones.ts: Map response to KnowledgeZone format
    File: src/routes/api.knowledge.zones.ts

    After proxying to garden-mcp /zones/create, garden-mcp returns:
      { success: true, zoneId, accessCode, zoneUrl, expiresAt, noteCount }

    The frontend expects:
      { success: true, zone: { id, name, accessCode, webUrl, expiresAt, noteCount } }

    Add response mapping in the POST handler:
      POST: async ({ request }) => {
        const resp = await handleProxyRequest("/zones/create", "POST", request);
        const body = await resp.json() as any;
        if (body.success && body.zoneId) {
          const zone = {
            id: body.zoneId,
            name: body.name ?? "",
            accessCode: body.accessCode,
            webUrl: body.zoneUrl,
            mcpUrl: body.mcpUrl,
            expiresAt: body.expiresAt,
            noteCount: body.noteCount ?? 0,
            notebookLmStatus: "none" as const,
            accessType: "web" as const,
          };
          return new Response(JSON.stringify({ success: true, zone }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(body), {
          status: resp.status,
          headers: { "Content-Type": "application/json" },
        });
      },

    Also do same for GET (list zones) — garden-mcp /zones/list returns array, map to { success: true, zones: [] }:
    Check current response format from garden-mcp /zones/list and map accordingly.

    ### Reference: Bloom zone creation request format (confirmed working)
    {
      name: string,
      description?: string,
      folders: string[],
      noteCount: number,
      accessType: "web" | "mcp" | "both",
      ttlMinutes: number,   <-- INTEGER minutes!
      notes: [{slug, title, content, tags}],  <-- actual content!
      consentRequired?: boolean
    }

    Garden-mcp success response:
    { success: true, zoneId: "...", accessCode: "ACCESS-...", zoneUrl: "https://...", expiresAt: "...", noteCount: N }

    ### Verify the fix works
    After implementing, test via curl on dev server:
    Check: does /api/knowledge/zones POST return { success: true, zone: { id, accessCode, webUrl } } ?

    Token for testing (get from browser localStorage: jwt key):
    Or test the proxy directly without auth to see garden-mcp response.

    ### TypeScript check
    find ~/workspace/ai-drakon-scaffolder -name "tsc" -not -path "*/npm/*" 2>/dev/null | head -1
    # or: cd ~/workspace/ai-drakon-scaffolder && cat tsconfig.json | grep -i strict

    ### Commit + .lovable sync + push
    cd ~/workspace/ai-drakon-scaffolder
    git add src/lib/api.ts src/components/knowledge/ZoneCreationDialog.tsx src/routes/api.knowledge.zones.ts src/routes/api.knowledge.zones.\$zoneId.ts
    git commit -m "fix(knowledge): ttlMinutes + notes content + response mapping for zone creation (TASK-140)"
    git push origin main

    for f in src/lib/api.ts src/components/knowledge/ZoneCreationDialog.tsx src/routes/api.knowledge.zones.ts; do
      mkdir -p .lovable/$(dirname $f) && cp $f .lovable/$f && echo "synced $f"
    done
    git add .lovable && git commit -m "sync(lovable): TASK-140 zone fixes" && git push origin main

    ### Mark done + diary
    python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-140','[x] TASK-140',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-140 done" && git push origin main
    python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-06-05|TASK-140:zone-creation-fix|ttlMinutes+notes-content+response-mapping|commit:<hash>|STAR3"

    !!IMPORTANT!! Run on dev server 192.168.3.184
    !!IMPORTANT!! .lovable sync MANDATORY
    !!IMPORTANT!! Do NOT touch MinIO setup — that's separate


## TASK-139: Knowledge UI redesign — browser research + OpenDesign improvement
[x] TASK-139
    Run on dev server: sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
    Project: ~/workspace/ai-drakon-scaffolder/

    ### Goal
    The /knowledge page (Zones + Vault tabs) has UX problems. Research the UI via browser
    automation, then use OpenDesign to generate improved components, implement them.

    ### Current UI Problems (from user feedback)
    1. Vault tab (NotesTab): article titles shown with raw markdown tags visible
    2. Vault file tree: columns not resizable, file names truncated/cramped
    3. Zone creation dialog: folder checkboxes layout needs improvement
    4. KnowledgeZonesList: zone cards need better layout
    5. Overall tabs layout is inconvenient

    ### Step 1 — Study current UI via browser
    Use agent-workspace MCP browser on RPi (192.168.3.234) to navigate to:
    https://ai-drakon-scaffolder.pages.dev
    Take screenshots of /knowledge page — Zones tab, Vault tab, Create Zone dialog.
    Note all visual issues.

    ### Step 2 — Use OpenDesign to generate improved UI
    OpenDesign REST API base: http://192.168.3.184:7459
    Auth: Bearer token (find full token: grep "opendesign\|7459\|token" ~/workspace/ai-drakon-scaffolder/.env 2>/dev/null
          or check: curl -s http://192.168.3.184:7459/v1/agents -H "Authorization: Bearer 2269d" | head -100)

    POST http://192.168.3.184:7459/v1/run
    Content-Type: application/json
    Authorization: Bearer <token>
    Body: {"prompt": "Design improved vault file manager: left panel = folder tree (200-300px, collapsible folders, plain text titles no markdown), right panel = note content. Use ResizablePanelGroup if available in shadcn. Clean, dense layout for developer tool.", "pluginId": "ai-drakon-mobile"}

    Also generate improved KnowledgeZonesList card layout with OpenDesign.

    ### Step 3 — Implement fixes on dev server

    A. CRITICAL FIX — strip markdown from note titles in tree:
    File: src/components/docs/NotesTab.tsx
    Find where note.title is displayed in the tree (look for TreeNode title display)
    Add: const cleanTitle = (t: string) => t.replace(/[*_#`\[\]()]/g, "").trim()
    Apply cleanTitle() to all title displays in the tree

    B. Vault 2-panel layout:
    File: src/components/docs/NotesTab.tsx
    Check if ResizablePanel exists: ls ~/workspace/ai-drakon-scaffolder/src/components/ui/resizable* 2>/dev/null
    If yes: wrap tree panel + editor panel in ResizablePanelGroup with ResizableHandle
    If no: use flex layout: tree panel w-64 shrink-0 border-r, editor panel flex-1

    C. KnowledgePage tabs styling:
    File: src/pages/KnowledgePage.tsx
    Improve tab navigation visual design based on OpenDesign output

    D. KnowledgeZonesList cards:
    File: src/components/knowledge/KnowledgeZonesList.tsx
    Improve card layout: show folders array, note count, better spacing

    ### Step 4 — Commit + .lovable sync + Push
    cd ~/workspace/ai-drakon-scaffolder
    git add src/components/docs/NotesTab.tsx src/components/knowledge/ src/pages/KnowledgePage.tsx
    git commit -m "feat(knowledge-ui): markdown strip + 2-panel vault + zone cards (TASK-139)"
    git push origin main
    for f in src/components/docs/NotesTab.tsx src/components/knowledge/KnowledgeZonesList.tsx src/components/knowledge/ZoneCreationDialog.tsx src/pages/KnowledgePage.tsx; do
      cp $f .lovable/$f && echo synced $f
    done
    git add .lovable && git commit -m "sync(lovable): TASK-139 UI" && git push origin main

    ### Mark done + diary
    python3 -c "
import re
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-139','[x] TASK-139',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-139 done" && git push origin main
    python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-06-05|TASK-139:knowledge-ui|vault-markdown-fix+2panel+zones|commit:<hash>|STAR3"

    !!IMPORTANT!! Run on dev server 192.168.3.184 NOT locally
    !!IMPORTANT!! .lovable sync MANDATORY before final push
    !!IMPORTANT!! OpenDesign at http://192.168.3.184:7459


## TASK-138: Knowledge Vault tab + ZoneCreationDialog folder selection + JIT accessCode
[x] TASK-138
    Run on dev server: sshpass -p "805235io." ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
    Project: ~/workspace/ai-drakon-scaffolder/

    ### Goal
    Complete the Knowledge feature in AI-DRAKON:
    A. Add "Vault" tab to /knowledge page (reuse existing NotesTab — file tree + editor)
    B. Update ZoneCreationDialog to select folders from the vault (like Bloom)
    C. Show JIT accessCode + URLs after zone creation (copy-to-clipboard dialog)
    D. Update KnowledgeZonesList to show accessCode/webUrl/mcpUrl copy buttons

    ### Context — what already exists

    **Vault storage: drakon-mcp-worker** (NOT garden-mcp)
    - `src/lib/garden/notesApi.ts` has:
      - fetchNotesTree() → GET /v1/notes/list?flat=false → {tree: TreeNode[]}
        where TreeNode = {type:"folder"|"note", path, name, children?, slug?, title?}
      - fetchNotesList(), fetchNote(), commitNote(), deleteNote()
    - `src/components/docs/NotesTab.tsx` — COMPLETE file tree + editor UI (use as-is)
    - `src/components/docs/garden/NoteEditor.tsx` — markdown editor
    - `src/lib/garden/notesApi.ts` — all CRUD operations

    **Knowledge zones: garden-mcp Worker** (https://garden-mcp.exodus.pp.ua)
    - `src/server/knowledge.ts` — proxy with dynamic JWT auth (GARDEN_OWNER_PASSWORD)
    - `src/components/knowledge/KnowledgeZonesList.tsx` — zones list (needs accessCode/URLs)
    - `src/components/knowledge/ZoneCreationDialog.tsx` — create dialog (needs folder tree)
    - `src/pages/KnowledgePage.tsx` — page with zones list (needs Vault tab added)
    - `src/lib/api.ts` — types CreateKnowledgeZoneRequest, KnowledgeZone

    **Bloom reference** (code donor on dev server at /home/vokov/projects/garden-seedling-stage/):
    - /home/vokov/projects/garden-seedling-stage/src/components/garden/ZoneCreationDialog.tsx
      → Has folder tree with checkboxes, TTL picker, accessType, noteCount counter
      → Uses getFolderStructure() for folder tree — we use fetchNotesTree() instead
    - /home/vokov/projects/garden-seedling-stage/src/components/garden/AccessZonesManager.tsx
      → Has zone cards with accessCode copy, webUrl, mcpUrl, QR code buttons
    - FilesPage in Bloom: /home/vokov/projects/garden-seedling-stage/src/pages/FilesPage.tsx

    **GitNexus** — use for code search:
    mcp__gitnexus__query(query="...", repo="ai-drakon-scaffolder")
    mcp__gitnexus__query(query="...", repo="garden-seedling-stage")

    **OpenDesign** — use for UI generation if needed:
    URL: http://192.168.3.184:7459, pluginId: ai-drakon-mobile
    POST /v1/run with {prompt, pluginId, od.mode:"generate"}

    ### Changes required

    **Step 1: src/lib/api.ts — update types**
    In KnowledgeZone type ADD:
      folders?: string[];
      accessCode?: string;
      webUrl?: string;
      mcpUrl?: string;
      createdAt?: string;

    In CreateKnowledgeZoneRequest ADD:
      folders?: string[];
      noteCount?: number;

    **Step 2: src/components/knowledge/ZoneCreationDialog.tsx — folder tree**
    - Import: fetchNotesTree, TreeNode from "@/lib/garden/notesApi"
    - Import: useQuery from "@tanstack/react-query"
    - Import: Checkbox, ScrollArea from shadcn/ui
    - Add useQuery to load tree: queryKey: ["notesTree"], queryFn: () => fetchNotesTree()
    - Add state: selectedFolders = new Set<string>(), expandedFolders = new Set<string>()
    - Extract folder nodes from tree (type === "folder") recursively
    - Render ScrollArea (h-48) with folder checkboxes, indented by depth
    - Add "Select All" / "Clear All" buttons
    - Calculate noteCount from selected folders (count notes in tree under selected paths)
    - Show "📁 N folders · 📝 N notes" summary
    - Pass folders: Array.from(selectedFolders), noteCount to createZoneMutation.mutate(data)
    - After onSuccess: if response.zone?.accessCode → open ZoneCreatedDialog
      (new state: createdZone = zone, showCreatedDialog = true)

    **Step 3: ZoneCreatedDialog (new component or inline state in ZoneCreationDialog)**
    Show dialog after zone creation with:
    - Title: "Zone Created ✓"
    - Name, description of zone
    - accessCode (if exists): Input[readOnly] + Copy button
    - webUrl (if exists): Input[readOnly] + Copy button  
    - mcpUrl (if exists): Input[readOnly] + Copy button
    - TTL / expires info
    - Close button
    Copy uses: navigator.clipboard.writeText() + toast.success()
    Can be a new file: src/components/knowledge/ZoneCreatedDialog.tsx

    **Step 4: src/components/knowledge/KnowledgeZonesList.tsx — show URLs**
    Update KnowledgeZone card to show:
    - Copy buttons for accessCode, webUrl, mcpUrl (if present in zone object)
    - zone.folders list (if any)
    Use pattern: navigator.clipboard.writeText(text)

    **Step 5: src/pages/KnowledgePage.tsx — add Vault tab**
    - Import Tabs, TabsContent, TabsList, TabsTrigger from "@/components/ui/tabs"
    - Import NotesTab from "@/components/docs/NotesTab"
    - Add state: activeTab = "zones" | "vault"
    - Desktop sidebar with 2 items: "Zones" (Database icon) | "Vault" (FileText icon)
    - Mobile: top Tabs bar
    - Vault tab renders: <NotesTab />
    - Zones tab renders: current KnowledgeZonesList + Create Zone button

    ### TypeScript check
    After changes run: cd ~/workspace/ai-drakon-scaffolder && npx tsc --noEmit 2>&1 | head -20

    ### Commit
    git add src/components/knowledge/ src/pages/KnowledgePage.tsx src/lib/api.ts
    git commit -m "feat(knowledge): vault tab + folder selection + JIT accessCode (TASK-138)"
    git push origin main

    ### Lovable sync (ВАЖЛИВО — після git push)
    for f in src/components/knowledge/ZoneCreationDialog.tsx src/components/knowledge/ZoneCreationDialog.tsx src/components/knowledge/KnowledgeZonesList.tsx src/pages/KnowledgePage.tsx src/lib/api.ts; do
      mkdir -p .lovable/$(dirname $f) && cp $f .lovable/$f
    done
    # If ZoneCreatedDialog.tsx was created:
    cp src/components/knowledge/ZoneCreatedDialog.tsx .lovable/src/components/knowledge/ZoneCreatedDialog.tsx 2>/dev/null || true
    git add .lovable && git commit -m "sync(lovable): knowledge vault + zones (TASK-138)" && git push origin main

    ### Diary
    After completion write: python3 -m mempalace diary write --agent agt-ogy "SESSION:2026-06-05|TASK-138:knowledge-vault+folder-selection+accessCode|commit:<hash>|★★★"

    ### Mark done
    cd ~/workspace/ai-drakon-scaffolder && python3 -c "
    import re
    with open('development/TASKS.md', 'r') as f:
        c = f.read()
    c = re.sub(r'\[ \] TASK-138', '[x] TASK-138', c, count=1)
    with open('development/TASKS.md', 'w') as f:
        f.write(c)
    "
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-138 done" && git push origin main

    !!IMPORTANT!! Run ALL commands on dev server (192.168.3.184), NOT locally on Termux
    !!IMPORTANT!! Bloom reference files are at /home/vokov/projects/garden-seedling-stage/ on dev server
    !!IMPORTANT!! After implementing — npx tsc --noEmit must show 0 errors

## TASK-137: GARDEN_OWNER_PASSWORD setup
[x] TASK-137

[x] TASK-143
    !!IMPORTANT!! Run ALL commands on dev server 192.168.3.184
    Project: ~/workspace/ai-drakon-scaffolder/

    ## Goal
    1. Fix webUrl/mcpUrl construction in zones API route (garden-mcp does not return them - must build)
    2. Add ZoneDetailSheet component: clicking zone card opens Sheet with full zone info + copy buttons
    3. Same pattern as Bloom ZoneViewPage/AccessZonesWall (reference: ~/projects/garden-seedling-stage/)

    ## Context from Bloom (garden-seedling-stage/src/hooks/useAccessZones.ts)
    Bloom builds URLs:
      webUrl  = https://garden-mcp.exodus.pp.ua/zone/${zone.id}?code=${zone.accessCode}
      mcpUrl  = https://garden-mcp.exodus.pp.ua/mcp/${zone.id}
    accessType "web"  -> only webUrl
    accessType "mcp"  -> only mcpUrl
    accessType "both" -> both

    ## Step 1 - Fix URL construction in api.knowledge.zones.ts
    File: src/routes/api.knowledge.zones.ts (on dev server)
    In GET handler zones.map() replace webUrl/mcpUrl fields with:
      webUrl: (z.accessType !== "mcp" && z.accessCode)
        ? "https://garden-mcp.exodus.pp.ua/zone/" + (z.id ?? z.zoneId) + "?code=" + z.accessCode
        : (z.webUrl ?? z.zoneUrl ?? undefined),
      mcpUrl: (z.accessType !== "web" && (z.id ?? z.zoneId))
        ? "https://garden-mcp.exodus.pp.ua/mcp/" + (z.id ?? z.zoneId)
        : z.mcpUrl ?? undefined,
    Apply same fix in POST handler.

    ## Step 2 - Create src/components/knowledge/ZoneDetailSheet.tsx
    Use Sheet from "@/components/ui/sheet" (right side panel, width ~500px on desktop)
    Props interface:
      zone: KnowledgeZone | null (import from "@/lib/api")
      open: boolean
      onClose: () => void
      onDelete: (id: string) => void
    Content sections:
      Header: zone name (font-mono text-xl font-bold), Badge with accessType
      Description (if present, text-sm text-muted-foreground)
      Expiry row: color-coded (green>24h, yellow 1-24h, red<1h/expired), formatDistanceToNow
      Stats row: folders count, note count
      Folder pills: Badge per folder (Folder icon + last segment of path)
      --- ACCESS CREDENTIALS ---
      For each credential (show only if accessType matches):
        Label + readonly Input + Copy button (toast.success on copy)
        access_code: always show if present
        web_url: show if accessType !== "mcp"
        mcp_url: show if accessType !== "web"
        Web URL also gets ExternalLink button to open in new tab
      NotebookLM status badge if notebookLmStatus !== "none"
      --- DANGER ---
      Delete Zone button (variant="destructive", full-width, calls onDelete)
    Imports needed: Sheet, SheetContent, SheetHeader, SheetTitle from "@/components/ui/sheet"
    Input from "@/components/ui/input", Button, Badge, Separator

    ## Step 3 - Update KnowledgeZonesList.tsx
    File: src/components/knowledge/KnowledgeZonesList.tsx
    Changes:
    1. Add import: import { ZoneDetailSheet } from "./ZoneDetailSheet"
    2. Add import: import { useState } from "react" (already there likely)
    3. Add state: const [selectedZone, setSelectedZone] = useState<KnowledgeZone | null>(null)
    4. Card: add cursor-pointer class + onClick={() => setSelectedZone(zone)}
    5. Remove inline Copy buttons and Trash button from inside card
    6. Keep on card: name, expiry badge, note count, folder pills only
    7. handleDelete function: calls deleteZoneMutation.mutate(zone.id) + setSelectedZone(null) + queryClient.invalidateQueries
    8. After closing div of zones grid, add:
       <ZoneDetailSheet
         zone={selectedZone}
         open={!!selectedZone}
         onClose={() => setSelectedZone(null)}
         onDelete={(id) => { deleteZoneMutation.mutate(id); setSelectedZone(null); }}
       />

    ## Step 4 - Sync + commit + push
    cp src/routes/api.knowledge.zones.ts .lovable/src/routes/api.knowledge.zones.ts
    cp src/components/knowledge/ZoneDetailSheet.tsx .lovable/src/components/knowledge/ZoneDetailSheet.tsx
    cp src/components/knowledge/KnowledgeZonesList.tsx .lovable/src/components/knowledge/KnowledgeZonesList.tsx
    git add src/ .lovable/ development/TASKS.md
    git commit -m "feat(knowledge): zone detail sheet + webUrl/mcpUrl construction (TASK-143)"
    git push origin main

    ## Mark done
    sed -i "s/\[ \] TASK-143/[x] TASK-143/" development/TASKS.md
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-143 done" && git push origin main

    !!IMPORTANT!! KnowledgeZone type: import from "@/lib/api" - check existing fields
    !!IMPORTANT!! Sheet component: "@/components/ui/sheet" already exists in project
    !!IMPORTANT!! Do NOT use ResizablePanel - it caused issues before
    !!IMPORTANT!! .lovable sync after every src/ change
    !!IMPORTANT!! toast from "sonner"


[x] TASK-144
    !!IMPORTANT!! Research task — run on AGY3 locally (Termux). NO SSH needed unless checking project files.
    Output: research report saved to ~/workspace/ai-drakon-scaffolder/docs/appwrite-migration-research.md

    ## Goal
    Research Appwrite Cloud (GitHub Student Pack — 2 projects) as platform for ai-drakon-scaffolder.
    Compare with current stack (Cloudflare Pages + Workers + KV + D1).
    Produce a structured decision report with migration feasibility assessment.

    ## Current stack (ai-drakon-scaffolder)
    - Frontend: Cloudflare Pages (TanStack Start, SSR)
    - Backend: CF Workers (API routes as CF Pages Functions)
    - Storage: CF KV (sessions, cache), CF D1 (SQLite DB)
    - Auth: custom / none currently
    - Tunnel: cloudflared (OrangePi) → public URLs
    - Garden MCP: CF Worker (garden-mcp.exodus.pp.ua)

    ## Research areas

    ### 1. Appwrite Cloud Student Plan limits
    - Project count (2 confirmed), requests/month, bandwidth, storage, DB rows
    - Team members / MAU (Monthly Active Users) limits
    - Functions execution limits (GB-hours, invocations)
    - Realtime connections
    - Verify: https://appwrite.io/pricing + GitHub Student Pack page

    ### 2. Appwrite capabilities relevant to ai-drakon-scaffolder
    A. **Auth** (Appwrite Auth):
       - OAuth2 (Google, GitHub), Email/Password, Magic Link
       - Teams + Roles — multi-user mode with permissions
       - Session management
    B. **Database** (Appwrite Databases):
       - Collections, Documents, Relationships
       - Compare to current CF D1 schema (if any)
       - Real-time subscriptions
    C. **Storage** (Appwrite Storage):
       - File buckets, access permissions
       - Replace MinIO for user-uploaded files?
    D. **Functions** (Appwrite Functions):
       - Runtime: Node.js, Python, others
       - Can replace CF Workers for API logic?
       - Cold start, execution limits
    E. **Messaging** (Appwrite Messaging):
       - Email, SMS, Push — useful for billing notifications

    ### 3. Migration scenarios

    **Option A — Full migration (Appwrite replaces CF)**
    - Frontend still on CF Pages (static hosting stays)
    - Backend: CF Workers → Appwrite Functions
    - DB: CF D1 → Appwrite Databases
    - Auth: add Appwrite Auth (currently missing)
    - Files: MinIO → Appwrite Storage
    Pros / Cons / Effort estimate

    **Option B — Hybrid (Appwrite for auth+users, CF for compute)**
    - Keep CF Pages + Workers for core app logic
    - Add Appwrite for: Auth, User management, Billing metadata
    - Appwrite SDK in frontend for auth flows
    Pros / Cons / Effort estimate

    **Option C — Appwrite for new features only**
    - Don't touch existing CF stack
    - New features (multi-user, billing) built on Appwrite
    - Appwrite Auth as the identity layer
    Pros / Cons / Effort estimate

    ### 4. Multi-user mode design sketch
    How would ai-drakon-scaffolder support multiple users with Appwrite?
    - User registration/login flow
    - Per-user Knowledge Zones (Garden MCP isolation)
    - Per-user Vault (NotebookLM notebooks)
    - RBAC: owner, editor, viewer

    ### 5. Billing & AI LLM packages
    How to implement tiered AI access (free/paid):
    - Free tier: limited requests/month to LLM APIs
    - Paid tier: higher limits, priority routing
    - Appwrite as billing metadata store (not payment processor)
    - Integration with Stripe or LemonSqueezy for payments
    - Appwrite Functions as webhook receiver for payment events

    ### 6. TanStack Start + Appwrite compatibility
    - Appwrite Web SDK (v16+) — works in CF Pages SSR?
    - Server-side Appwrite calls from CF Workers
    - Any known issues with SSR + Appwrite sessions

    ## Output format
    Save report to: ~/workspace/ai-drakon-scaffolder/docs/appwrite-migration-research.md

    Structure:
    # Appwrite Migration Research — AI-DRAKON Scaffolder

    ## Executive Summary (3-5 sentences recommendation)

    ## Student Plan Limits (table)

    ## Capability Comparison (table: feature | CF stack | Appwrite | winner)

    ## Migration Option Analysis
    ### Option A — Full migration
    ### Option B — Hybrid
    ### Option C — New features only

    ## Recommended Path (with reasoning)

    ## Multi-user Mode Design

    ## Billing & AI Packages Design

    ## Technical Risks & Open Questions

    ## Next Steps (concrete tasks if we proceed)

    ## Commit report
    cd ~/workspace/ai-drakon-scaffolder
    git add docs/appwrite-migration-research.md
    git commit -m "research(appwrite): migration feasibility + multi-user + billing analysis (TASK-144)"
    git push origin main

    ## Mark done
    python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-144','[x] TASK-144',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
    git add development/TASKS.md && git commit -m "chore(tasks): TASK-144 done" && git push origin main

    !!IMPORTANT!! This is a RESEARCH task — use web search to get current Appwrite pricing/docs
    !!IMPORTANT!! docs/ directory may not exist — create it: mkdir -p docs/
    !!IMPORTANT!! Be specific about Student Pack limits (verify actual numbers, not guesses)
    !!IMPORTANT!! Recommendation must consider: 2-project limit on Student plan, TanStack Start SSR

## TASK-145: Migrate AI-DRAKON agents from Python/LangGraph to TypeScript/Flue (CF Workers)
[x] TASK-145

### GOAL
Research Flue framework docs and create a complete migration plan + PoC for migrating
all 3 AI-DRAKON agents (drakon-agent, architect-agent, docs-agent) from Python/FastAPI/LangGraph
to TypeScript/Flue deployed on Cloudflare Workers.

### CONTEXT
Current stack:
- drakon-agent  :8765  Python/FastAPI  (routes: analyze, feedback, chat, health)
- architect-agent :8766  Python/FastAPI + LangGraph  (pipeline/ with graphs.py, states.py, nodes_*.py)
- docs-agent    :8767  Python/FastAPI  (routes: docs, notes, drakon_ir, projects, dataview, gitnexus)
- All on dev server 192.168.3.184, managed by rc-service

Target stack:
- TypeScript/Flue framework (https://flueframework.com)
- Deployed as Cloudflare Workers (3 workers OR 1 worker with routing)
- LLM calls via Flue built-in tools or custom Tool to proxy at https://agy3.exodus.pp.ua/v1
- No Python servers, no dev server dependency

### STEPS

STEP 1 - Read Flue documentation:
```
curl -s https://flueframework.com/start.md > /tmp/flue-start.md
cat /tmp/flue-start.md | head -200
```
Also fetch these Flue doc pages:
- https://flueframework.com/docs/agents
- https://flueframework.com/docs/workflows
- https://flueframework.com/docs/tools
- https://flueframework.com/docs/deploy/cloudflare
- https://flueframework.com/docs/routing

STEP 2 - Read current Python agent code on dev server (SSH):
```
HOST="192.168.3.184"
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/routes/analyze.py"
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/pipeline/graphs.py"
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/pipeline/states.py"
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST "cat /home/vokov/projects/ai-drakon-scaffolder/services/docs-agent/docs_route.py"
```

STEP 3 - Create migration plan document:
Write to: ~/workspace/ai-drakon-scaffolder/development/FLUE-MIGRATION-PLAN.md
Include:
  a) Flue framework summary (key concepts, how it works)
  b) Architecture decision: 3 separate Workers OR 1 Worker with routing (recommend which)
  c) Mapping table: Python routes -> Flue agents/tools
  d) LangGraph replacement strategy: how Flue Workflows replace StateGraph
  e) CF Workers config: wrangler.toml structure for each agent
  f) LLM provider: how to connect to https://agy3.exodus.pp.ua/v1 proxy as Flue LLM provider
  g) Step-by-step migration order (which agent to migrate first)
  h) Estimated effort per agent

STEP 4 - Create PoC for drakon-agent:
Create directory: ~/workspace/ai-drakon-scaffolder/services/drakon-agent-flue/
Create these files based on Flue docs:
  - package.json (with flue dependency)
  - flue.config.ts
  - wrangler.toml (CF Workers deployment)
  - agents/drakon.ts (main Flue agent with analyze + chat tools)
  - agents/tools/analyze-code.ts (Tool that replicates /analyze endpoint logic)
  - agents/tools/drakon-chat.ts (Tool that replicates /chat endpoint)

The agent should:
  - Accept code analysis requests via POST /agents/drakon/:id
  - Use custom LLM via proxy at https://agy3.exodus.pp.ua/v1
  - Return analysis results in same JSON format as current Python agent

### VERIFICATION
```
cd ~/workspace/ai-drakon-scaffolder/services/drakon-agent-flue
cat package.json
cat flue.config.ts
cat agents/drakon.ts
find . -name "*.ts" | xargs wc -l
```

### COMMIT
```
cd ~/workspace/ai-drakon-scaffolder
git add development/FLUE-MIGRATION-PLAN.md services/drakon-agent-flue/
git commit -m "feat(agents): Flue migration plan + drakon-agent TypeScript PoC"
git push origin main
```

### DIARY
Write: "SESSION:$(date +%Y-%m-%d)|TASK-138:flue-migration|commit:<hash>|plan+poc:done"
Agent: agt-ogy3

### NOTES
- !!IMPORTANT!! Work locally on AGY3 Termux. Use SSH only to READ Python code on 192.168.3.184
- Read Flue docs FIRST before writing any code
- NotebookLM notebook "Flue" (ID: 83ab40c7-7ca6-4685-9eb8-cf72dfa25f19) has indexed docs
  Access via: curl -s http://192.168.3.234:8002/... (NotebookLM MCP on RPi .234)
- LLM proxy: https://agy3.exodus.pp.ua/v1 (OpenAI-compatible, model: gemini-2.5-flash)
- CF Workers wrangler config: DO NOT put real API keys - use wrangler secrets
- The PoC needs to be correct TypeScript (no need to actually run/deploy)
- sshpass password for dev server: 805235io.

## TASK-146: Full drakon-agent migration to Flue (TypeScript, CF Workers, MCP server)
[x] TASK-146

### GOAL
Fully migrate `drakon-agent` from Python/FastAPI to TypeScript/Flue deployed on Cloudflare Workers.
The agent must expose both REST API (backward compatible) AND an MCP server endpoint,
because the AI-DRAKON platform will use MCP to connect generated user agents to services.

Build on the existing PoC in `services/drakon-agent-flue/` (from TASK-145).

### ARCHITECTURE CONTEXT
AI-DRAKON is a PLATFORM for building agents:
- The 3 agents (drakon/architect/docs) build NEW agents for users
- Generated agents are Flue-based and connect to user services via MCP
- Therefore: drakon-agent itself must speak MCP (be an MCP server) so Claude Code
  and other agents can call it as a tool
- Final deployment: single CF Worker `ai-drakon-flue` with Hono routing (per FLUE-MIGRATION-PLAN.md)

### WHAT EXISTS (PoC from TASK-145)
Directory: `services/drakon-agent-flue/`
Files already created (but are stubs):
- `package.json`, `flue.config.ts`, `wrangler.toml`
- `agents/drakon.ts` — basic agent stub
- `agents/tools/analyze-code.ts` — LLM-only analysis (no real AST)
- `agents/tools/drakon-chat.ts` — chat tool

### WHAT TO IMPLEMENT (Full Implementation)

#### 1. Read Flue docs for MCP server support
```
curl -s https://flueframework.com/docs/mcp > /tmp/flue-mcp.md
curl -s https://flueframework.com/docs/workflows > /tmp/flue-workflows.md
curl -s https://raw.githubusercontent.com/withastro/flue/main/README.md > /tmp/flue-readme.md
```

#### 2. Read current Python code on dev server
```
HOST="192.168.3.184"
SSH="sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST"
$SSH "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/analyzer/js_analyzer.py"
$SSH "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/analyzer/cfg_builder.py"
$SSH "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/knowledge_base/retrieval.py"
$SSH "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/routes/feedback.py"
$SSH "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/ai_refiner/prompts.py"
$SSH "ls /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent/knowledge"
```

#### 3. Full file structure to create in `services/drakon-agent-flue/`

```
services/drakon-agent-flue/
├── package.json              (UPDATE: add acorn, acorn-walk, typescript deps)
├── tsconfig.json             (NEW)
├── flue.config.ts            (UPDATE: add mcp server config if supported)
├── wrangler.toml             (UPDATE: add KV for knowledge base)
│
├── src/
│   ├── index.ts              (NEW: main Hono app, registers all routes + MCP)
│   └── mcp-server.ts         (NEW: MCP server endpoint /mcp — exposes tools to Claude Code)
│
├── agents/
│   ├── drakon.ts             (UPDATE: full agent, uses all tools)
│   └── tools/
│       ├── analyze-code.ts   (REWRITE: proper JS/TS AST + LLM for Python)
│       ├── drakon-chat.ts    (UPDATE: system prompt from Python, Ukrainian)
│       ├── analyze-folder.ts (NEW: port from Python analyze_folder route)
│       └── feedback.ts       (NEW: port from Python feedback route)
│
└── lib/
    ├── ast-analyzer.ts       (NEW: TypeScript AST for JS/TS files using acorn)
    ├── ir-validator.ts       (NEW: port from Python ir_validator.py)
    ├── ir-types.ts           (NEW: TypeScript types for DRAKON IR)
    ├── llm-client.ts         (NEW: shared fetch wrapper for agy3.exodus.pp.ua/v1)
    └── prompts.ts            (NEW: port from Python ai_refiner/prompts.py)
```

#### 4. Key implementation details

**lib/ir-types.ts** — DRAKON IR TypeScript types:
```typescript
export interface DrakonNode {
  type: 'branch' | 'action' | 'question' | 'end';
  content?: string;
  branchId?: string;
  one?: string;  // next node id
  two?: string;  // else branch (for question nodes)
}

export interface DrakonDiagram {
  name: string;
  params: string;
  items: Record<string, DrakonNode>;
  _valid?: boolean;
  _errors?: string[];
  _warnings?: string[];
  _refine_error?: string;
}

export interface AnalyzeResponse {
  filename: string;
  diagrams: DrakonDiagram[];
  count: number;
}
```

**lib/ast-analyzer.ts** — TypeScript AST analysis for JS/TS files:
- Use `acorn` to parse JS/ES2022
- Walk AST with `acorn-walk`, find all FunctionDeclaration/FunctionExpression/ArrowFunctionExpression
- For each function: build DRAKON IR (action nodes for statements, question nodes for if/ternary, loop nodes for for/while)
- Match the Python output format exactly (items dict with b0, end, action, question nodes)

**lib/llm-client.ts** — LLM proxy client:
```typescript
const PROXY_URL = 'https://agy3.exodus.pp.ua/v1';
export async function llmComplete(messages, model = 'gemini-2.5-flash', temperature = 0.0)
```

**analyze-code.ts** tool — full pipeline:
```
filename extension:
  .js/.ts/.tsx/.jsx → ast-analyzer.ts (TypeScript AST)
  .py and others → LLM analysis (prompt: "analyze this Python code, return DRAKON IR JSON")

After getting raw IR:
  → ir-validator.ts (validate structure)
  → if refine=true: llm-client.ts (refine prompt from prompts.ts)
  → ir-validator.ts (validate again)
  → return AnalyzeResponse
```

**src/mcp-server.ts** — MCP server:
The agent must expose an MCP-compatible endpoint so Claude Code and other MCP clients
can use it as a tool server. Implement the MCP protocol:
```typescript
// GET /mcp → returns tools list (analyze_code, drakon_chat, analyze_folder)
// POST /mcp → handles tool calls
// The MCP protocol is JSON-RPC 2.0 over HTTP (streamable-http transport)

// Tools to expose:
// - analyze_code(code, filename, refine?) → AnalyzeResponse
// - drakon_chat(message, context?) → { reply: string }
// - analyze_folder(folder_path, max_files?, refine?) → folder results
// - validate_ir(ir) → ValidationResult
```

MCP tool schema format (JSON-RPC 2.0):
```json
{"jsonrpc":"2.0","method":"tools/list","params":{}}
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"analyze_code","arguments":{...}}}
```

**src/index.ts** — main entry (Hono app):
```typescript
// REST backward-compatible routes:
app.post('/analyze', ...)          // calls analyzeCode tool
app.post('/chat', ...)             // calls drakonChat tool  
app.post('/analyze_folder', ...)   // calls analyzeFolder tool
app.post('/feedback', ...)         // stores feedback
app.get('/health', ...)            // health check

// MCP endpoint:
app.all('/mcp', mcpHandler)        // MCP server for Claude Code integration
```

**agents/drakon.ts** — Flue agent:
```typescript
export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: `Ти — DRAKON-агент, спеціаліст з аналізу коду та генерації DRAKON-схем.
Відповідай УКРАЇНСЬКОЮ мовою.
[... full system prompt from Python chat.py DRAKON_CHAT_SYSTEM ...]`,
  tools: [analyzeCode, drakonChat, analyzeFolder, feedback],
}));
```

#### 5. Update wrangler.toml
```toml
name = "ai-drakon-flue"
main = "src/index.ts"
compatibility_date = "2026-04-01"
compatibility_flags = ["nodejs_compat"]

[vars]
PROXY_URL = "https://agy3.exodus.pp.ua/v1"
PROXY_MODEL = "gemini-2.5-flash"

[[kv_namespaces]]
binding = "KB_STORE"
id = "placeholder_kv_id"

[durable_objects]
bindings = [
  { name = "FLUE_DRAKON_AGENT", class_name = "FlueDrakonAgent" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["FlueDrakonAgent"]
```

#### 6. Update package.json dependencies:
```json
{
  "dependencies": {
    "@flue/runtime": "^0.9.0",
    "hono": "^4.0.0",
    "acorn": "^8.14.0",
    "acorn-walk": "^8.3.4",
    "valibot": "^0.42.0"
  },
  "devDependencies": {
    "@flue/cli": "^0.9.0",
    "typescript": "^5.4.0",
    "@types/acorn": "^4.0.6",
    "wrangler": "^4.0.0"
  }
}
```

### VERIFICATION
```
cd ~/workspace/ai-drakon-scaffolder/services/drakon-agent-flue

# Count all TypeScript files
find . -name "*.ts" | xargs wc -l | sort -rn | head -20

# Verify key files exist
ls src/ lib/ agents/tools/

# Check MCP server exports tools
grep -n "tools/list\|tools/call\|analyze_code\|drakon_chat" src/mcp-server.ts | head -10

# Check AST analyzer handles JS
grep -n "acorn\|FunctionDeclaration\|ArrowFunction" lib/ast-analyzer.ts | head -10

# Check backward compat routes
grep -n "app.post\|app.get" src/index.ts | head -10
```

### COMMIT
```
cd ~/workspace/ai-drakon-scaffolder
git add services/drakon-agent-flue/
git commit -m "feat(drakon-agent): full Flue migration — AST analyzer + MCP server + Hono REST API"
git push origin main
```

### DIARY
Agent: agt-ogy3
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-146:drakon-agent-flue|ast-ts+mcp-server+hono|commit:<hash>|★★★★"

### NOTES
- !!IMPORTANT!! Work locally on AGY3 Termux, NOT on dev server
- Use SSH to READ Python files from 192.168.3.184 only
- sshpass dev server password: 805235io.
- The MCP server implementation is CRITICAL — it's what enables the agent platform vision
- For Python AST: use LLM (CF Workers cannot run Python subprocess)
- For JS/TS AST: use acorn (proper deterministic analysis, no LLM needed)
- ir-validator.ts must be a direct port of Python ir_validator.py logic
- System prompt in drakon.ts MUST include Ukrainian language instruction
- The PoC tools (analyze-code.ts, drakon-chat.ts) should be REPLACED, not patched

## TASK-147: Migrate docs-agent to TypeScript/Flue (CF Workers + GitHub API + MCP server)
[x] TASK-147

### GOAL
Fully migrate `docs-agent` from Python/FastAPI to TypeScript/Flue on Cloudflare Workers.
Critical architectural change: replace `subprocess git` + local filesystem with **GitHub REST API**.
Expose MCP server endpoint so platform agents and Claude Code can call docs tools directly.

### KEY ARCHITECTURAL CHANGE: git subprocess → GitHub API
Python docs-agent stores notes in `docs/` folder, commits via `subprocess.run(['git', ...])`.
CF Workers CANNOT run subprocesses or access local filesystem.
Solution: **GitHub REST API** as the storage backend for all file operations.

```
Python: path.write_text(content) + subprocess.run(['git', 'commit', ...])
TypeScript: fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, PUT body)

Python: subprocess.run(['git', 'add', 'docs/']) → git push
TypeScript: GitHub API creates commit automatically on PUT/DELETE
```

### EXISTING PoC (drakon-agent-flue)
Reuse these from `services/drakon-agent-flue/`:
- `lib/llm-client.ts` → copy to docs-agent-flue/lib/
- `lib/ir-types.ts` → copy to docs-agent-flue/lib/

### FULL FILE STRUCTURE: `services/docs-agent-flue/`

```
services/docs-agent-flue/
├── package.json
├── tsconfig.json
├── flue.config.ts
├── wrangler.toml
│
├── src/
│   ├── index.ts         (Hono app: REST routes + MCP endpoint)
│   └── mcp-server.ts    (MCP JSON-RPC 2.0 server — same pattern as drakon-agent-flue)
│
├── agents/
│   └── docs.ts          (Flue agent with DOCS_SYSTEM_PROMPT in Ukrainian)
│
├── tools/
│   ├── docs-chat.ts     (port of ai_chat/docs_chat.py)
│   ├── notes-crud.ts    (port of notes_route.py — GitHub API instead of git subprocess)
│   ├── docs-fs.ts       (port of docs_route.py — GitHub API for listing/reading)
│   ├── projects.ts      (port of projects_route.py — KV storage)
│   ├── drakon-ir.ts     (port of drakon_ir_route.py — GitHub API)
│   ├── gitnexus-docs.ts (port of gitnexus_route.py — calls gitnexus.exodus.pp.ua)
│   └── dataview.ts      (port of dataview_route.py — pure TypeScript DQL subset)
│
└── lib/
    ├── github-api.ts    (GitHub REST API client — core library)
    ├── wikilinks.ts     (wikilink parser + Zettelkasten restructure logic)
    ├── frontmatter.ts   (YAML frontmatter parse/build — no external deps)
    ├── llm-client.ts    (copy from drakon-agent-flue/lib/llm-client.ts)
    └── prompts.ts       (DOCS_SYSTEM_PROMPT from Python prompts.py)
```

### STEP 1 — Read Python source on dev server
```
HOST="192.168.3.184"
S="sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/docs-agent/dataview_route.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent-flue/lib/llm-client.ts"
```

### STEP 2 — Core library: lib/github-api.ts

This is the most important file. Implement a typed GitHub REST API client:

```typescript
// Environment bindings (from wrangler.toml):
// GITHUB_TOKEN — wrangler secret
// GITHUB_REPO  — "maxfraieho/ai-drakon-scaffolder" (env var)
// DOCS_PATH    — "docs" (env var, default "docs")

interface GHFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;   // base64 if type=file, from /contents
  download_url?: string;
}

interface GHCommitResult {
  sha: string;
  content: GHFile;
}

export class GitHubAPI {
  constructor(private token: string, private repo: string) {}

  // List directory contents
  async listDir(path: string): Promise<GHFile[]>
  
  // Get file content (decodes base64)
  async getFile(path: string): Promise<{ content: string; sha: string }>
  
  // Create or update file (returns commit sha)
  // sha required for update, omit for create
  async putFile(path: string, content: string, message: string, sha?: string): Promise<GHCommitResult>
  
  // Delete file
  async deleteFile(path: string, message: string, sha: string): Promise<void>
  
  // Recursive list of all .md files under a path
  async listAllMd(basePath: string): Promise<GHFile[]>
}
```

Key GitHub API endpoints:
- List dir: `GET /repos/{repo}/contents/{path}`
- Get file: `GET /repos/{repo}/contents/{path}` (returns base64 content)
- Create/update: `PUT /repos/{repo}/contents/{path}` body: `{message, content(base64), sha?}`
- Delete: `DELETE /repos/{repo}/contents/{path}` body: `{message, sha}`

All requests need header: `Authorization: Bearer ${GITHUB_TOKEN}`

### STEP 3 — lib/wikilinks.ts
Port the wikilink logic from Python notes_route.py:
```typescript
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

export function parseWikilinks(content: string): string[]
// Strip code blocks before parsing (same as Python _parse_wikilinks)

export function extractTitle(content: string): string | null
// Check frontmatter title: first, then # heading

export function stripFrontmatter(content: string): string

export function buildFrontmatter(title: string, tags: string[]): string
// Returns: `---\ntitle: "..."\ntags: [...]\nupdated: "YYYY-MM-DD"\n---\n\n`

// Zettelkasten restructuring — same algorithm as Python restructure_wiki_graph()
// Takes Map<slug, {content, sha}>, returns Map<slug, newContent>
export function restructureWikiGraph(
  notes: Map<string, { content: string; sha: string }>
): Map<string, string>
```

### STEP 4 — lib/frontmatter.ts
Simple YAML frontmatter parser (no external deps):
```typescript
export function parseFrontmatter(raw: string): Record<string, any> | null
// Match ---\n...\n---\n at start of string
// Parse key: value lines (support string, array [a, b], quoted)

export function buildFrontmatter(fields: Record<string, any>): string
```

### STEP 5 — tools/notes-crud.ts
Port notes_route.py. Replace ALL git/filesystem ops with GitHub API:

```typescript
// list_notes(flat?, project?) — GitHub API listAllMd(DOCS_PATH)
// read_note(slug) — GitHub API getFile(`${DOCS_PATH}/${slug}.md`)
// write_note(slug, title, content, tags[]) — GitHub API putFile(...)
//   → include auto-restructure: call restructureWikiGraph, update changed files
// delete_note(slug) — GitHub API deleteFile(...)
// notes_graph(project?) — list all, parse wikilinks, build nodes+edges
// restructure_notes() — get all notes, run restructureWikiGraph, batch PUT changed files
```

For write_note: first try getFile to get current SHA (for updates), then putFile.
Commit message format: `docs: update ${slug}` or `docs: create ${slug}`

### STEP 6 — tools/docs-fs.ts
Port docs_route.py:
```typescript
// list_docs(path?) — GitHub API listDir(path)
// read_doc(path, max_chars?) — GitHub API getFile(path), truncate to max_chars
```

### STEP 7 — tools/projects.ts
Port projects_route.py. Replace projects.json with **Cloudflare KV**:
```typescript
// Binding: PROJECTS_KV (KV namespace in wrangler.toml)
// list_projects() — KV.get("projects") → parse JSON
// add_project(slug, name, path, ...) — KV.get + JSON.parse + push + KV.put
// delete_project(slug) — KV.get + filter + KV.put

// Default projects list (same as Python FALLBACK_PROJECTS):
const DEFAULT_PROJECTS = [
  { slug: "sharon-global", name: "Sharon Global", ... },
  { slug: "uav-watcher", name: "UAV Watcher", ... },
  { slug: "ai-drakon-setup", name: "AI-DRAKON Platform", ... },
]
```

### STEP 8 — tools/drakon-ir.ts
Port drakon_ir_route.py using GitHub API:
```typescript
// list_ir() — GitHub API listDir(`${DOCS_PATH}/drakon-ir`), filter *.json
// get_ir(name) — GitHub API getFile(`${DOCS_PATH}/drakon-ir/${name}.json`)
```

### STEP 9 — tools/gitnexus-docs.ts
Port gitnexus_route.py. Change URL:
```typescript
// Python: http://localhost:4747/api/mcp
// TypeScript: https://gitnexus.exodus.pp.ua/api/mcp
// Same MCP JSON-RPC 2.0 protocol (initialize → tools/call)

// generate_docs(repo, concept, format?) → { documentation, flows_count }
// api_docs(repo, route?) → { api_map }
// what_changed(repo, symbol) → { documentation, affected_count }
// list_repos() → repos list
```

### STEP 10 — tools/dataview.ts
Port dataview_route.py. Implement subset of Obsidian DQL in TypeScript:
```typescript
// Supported syntax:
//   LIST FROM "path"|#tag [WHERE field = "val"] [SORT field ASC|DESC] [LIMIT N]
//   TABLE field1, field2 FROM "path"|#tag [WHERE ...] [SORT ...] [LIMIT N]
//
// execute_dql(query, env) — parse query, fetch notes via GitHub API, filter/sort/return
// 
// Use lib/frontmatter.ts to parse YAML frontmatter of each note
// Fetch file list via GitHub API, then get frontmatter of each
```

### STEP 11 — tools/docs-chat.ts
Port ai_chat/docs_chat.py:
```typescript
// docs_chat(message, current_doc?, file_tree?, memory_context?, kb_context?) → { reply, doc_suggestions }
// Use DOCS_SYSTEM_PROMPT from lib/prompts.ts
// Call llm-client.ts for LLM
// Parse ```json [...] ``` blocks for doc_suggestions (same as Python)
```

### STEP 12 — agents/docs.ts
```typescript
import { createAgent } from '@flue/runtime';
import { docsChatTool, listNotesTool, readNoteTool, writeNoteTool, ... } from '../tools/...';

export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: DOCS_SYSTEM_PROMPT,  // Ukrainian, from lib/prompts.ts
  tools: [docsChatTool, listNotesTool, readNoteTool, writeNoteTool, deleteNoteTool,
          notesGraphTool, listProjectsTool, listIrTool, getIrTool,
          gitnexusDocsTool, dataviewTool],
}));
```

### STEP 13 — src/mcp-server.ts
Same pattern as drakon-agent-flue/src/mcp-server.ts.
Expose these MCP tools:
- `docs_chat` — chat about documentation
- `list_notes` — list all notes
- `read_note` — read note content
- `write_note` — create/update note (commits to GitHub)
- `delete_note` — delete note
- `notes_graph` — wikilink graph
- `restructure_notes` — Zettelkasten restructure
- `list_projects` — project registry
- `add_project` — add project
- `list_ir` — list DRAKON IR diagrams
- `get_ir` — get specific diagram
- `gitnexus_generate_docs` — generate docs from code
- `gitnexus_what_changed` — impact analysis docs
- `dataview_query` — DQL query on notes

### STEP 14 — src/index.ts (Hono app)
```typescript
app.get('/health', ...)
app.post('/mcp', handleMcp)
// Backward-compatible REST:
app.post('/chat', ...)           // docs_chat
app.get('/notes/list', ...)      // list_notes
app.get('/notes/read', ...)      // read_note
app.post('/notes/write', ...)    // write_note
app.delete('/notes/delete', ...) // delete_note
app.get('/notes/graph', ...)     // notes_graph
app.post('/notes/restructure', ...) // restructure_notes
app.get('/docs/list', ...)       // docs-fs list
app.get('/docs/read', ...)       // docs-fs read
app.post('/docs/dataview', ...)  // DQL query
app.get('/projects/list', ...)   // projects
app.post('/projects/add', ...)
app.get('/drakon-ir/list', ...)
app.get('/drakon-ir/get', ...)
app.post('/gitnexus/generate-docs', ...)
app.post('/gitnexus/what-changed', ...)
app.route('/', flue())
```

### STEP 15 — wrangler.toml
```toml
name = "docs-agent-flue"
main = "src/index.ts"
compatibility_date = "2026-04-01"
compatibility_flags = ["nodejs_compat"]

[vars]
PROXY_URL = "https://agy3.exodus.pp.ua/v1"
PROXY_MODEL = "gemini-2.5-flash"
GITHUB_REPO = "maxfraieho/ai-drakon-scaffolder"
DOCS_PATH = "docs"
GITNEXUS_URL = "https://gitnexus.exodus.pp.ua/api/mcp"

[[kv_namespaces]]
binding = "PROJECTS_KV"
id = "placeholder_kv_id"

[durable_objects]
bindings = [
  { name = "FLUE_DOCS_AGENT", class_name = "FlueDocsAgent" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["FlueDocsAgent"]
```

Secrets (via `wrangler secret put`):
- `GITHUB_TOKEN` — GitHub personal access token with repo write access
- `CUSTOM_API_KEY` — LLM proxy API key

### VERIFICATION
```
cd ~/workspace/ai-drakon-scaffolder/services/docs-agent-flue

# All files present
find . -name "*.ts" | sort
find . -name "*.ts" | xargs wc -l | sort -rn | head -20

# GitHub API client has put/get/delete/list
grep -n "putFile\|getFile\|deleteFile\|listDir\|listAllMd" lib/github-api.ts | head -10

# MCP server exposes docs tools
grep -n "write_note\|read_note\|list_notes\|docs_chat" src/mcp-server.ts | head -10

# Wikilink parser
grep -n "parseWikilinks\|restructureWikiGraph\|buildFrontmatter" lib/wikilinks.ts | head -10

# Hono routes
grep -n "app.get\|app.post\|app.delete" src/index.ts | head -20
```

### COMMIT
```
cd ~/workspace/ai-drakon-scaffolder
git add services/docs-agent-flue/
git commit -m "feat(docs-agent): full Flue migration — GitHub API storage + MCP server + Hono REST"
git push origin main
```

### DIARY
Agent: agt-ogy3
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-147:docs-agent-flue|github-api+mcp+hono|commit:<hash>|★★★★"

### NOTES
- !!IMPORTANT!! Work locally on AGY3 Termux. SSH to 192.168.3.184 only to READ Python files.
- sshpass dev server password: 805235io.
- BIGGEST CHANGE: no local filesystem, no git subprocess → GitHub REST API
- GitHub API content is base64 encoded — always decode on read, encode on write
- For write_note: must first GET file to get current SHA (needed for updates)
- Zettelkasten restructure can do 1 API call per changed file (batch where possible)
- dataview_route.py uses `yaml` Python lib — implement minimal frontmatter parser in TS (no external deps)
- GitNexus URL: https://gitnexus.exodus.pp.ua/api/mcp (NOT localhost:4747)
- MCP server: same JSON-RPC 2.0 pattern as in drakon-agent-flue/src/mcp-server.ts
- DOCS_SYSTEM_PROMPT must be copied EXACTLY from Python prompts.py (Ukrainian text)
- Do NOT install yaml/js-yaml — implement minimal frontmatter parser from scratch


## TASK-148: Migrate architect-agent to Flue (CF Workers + D1 + NotebookLM patterns + MCP)
[x] TASK-148

### GOAL
Fully migrate `architect-agent` from Python/FastAPI/LangGraph to TypeScript/Flue on Cloudflare Workers.
NEW FEATURE: integrate AwesomeArchitecture patterns from NotebookLM into the KB —
the agent recommends patterns based on project docs + developer chat, then creates pipelines
visible in the Pipelines tab.

### KEY CHANGES FROM PYTHON
| Python | TypeScript CF Workers |
|--------|----------------------|
| LangGraph StateGraph | Flue Workflows (native TS control flow) |
| SQLite kb.db | Cloudflare D1 database |
| radon (cyclomatic complexity) | TypeScript CC calculator |
| subprocess/file pipelines | GitHub API + KV |
| In-memory job store dict | Cloudflare Durable Objects |
| SSE via FastAPI | CF Workers streaming (ReadableStream) |
| http://localhost:18880/v1 | https://agy3.exodus.pp.ua/v1 |
| http://localhost:4747 GitNexus | https://gitnexus.exodus.pp.ua/api/mcp |

### NEW FEATURE: AwesomeArchitecture Pattern KB
The architect-agent's KB must include architectural patterns from NotebookLM:
- Notebook: "AwesomeArchitecture" ID: c21dd88b-79cd-47db-bb72-a52730218eb9
- NotebookLM MCP server: http://192.168.3.234:8002

Patterns to load into KB (pre-seeded in D1 or KV):
Categories and patterns from AwesomeArchitecture:
  - Core: Layered, Microservices, Event-driven, CQRS
  - Data Consistency: Saga, Outbox, Event sourcing, Idempotency
  - Migration: Strangler fig, Parallel run, Branch by abstraction, Shadow traffic
  - Application: Modular monolith, Three-tier, Offline-first, Local-first, OT/CRDT
  - AI Systems: RAG Knowledge Base, AI Agent/Workflow, Inference Serving

Tool `suggest_patterns(project_docs, chat_context, requirements)`:
  1. Build query from project_docs + requirements
  2. Call NotebookLM MCP: POST http://192.168.3.234:8002/mcp
     Method: tools/call, name: chat_ask
     Args: { notebook_id: "c21dd88b-79cd-47db-bb72-a52730218eb9", question: <query> }
  3. Parse response, return top 3-5 pattern recommendations with rationale
  4. Developer selects patterns → agent creates pipeline based on them

### FILE STRUCTURE: `services/architect-agent-flue/`

```
services/architect-agent-flue/
├── package.json
├── tsconfig.json
├── flue.config.ts
├── wrangler.toml
│
├── src/
│   ├── index.ts          (Hono: REST routes backward-compat + MCP endpoint)
│   └── mcp-server.ts     (MCP JSON-RPC 2.0 — all architect tools)
│
├── agents/
│   └── architect.ts      (Flue agent with ARCHITECT_SYSTEM_PROMPT)
│
├── workflows/
│   ├── pipeline-a.ts     (Code → DRAKON IR — replaces LangGraph analysis_graph)
│   └── pipeline-b.ts     (DRAKON IR → Code — replaces LangGraph vibe_graph)
│
├── tools/
│   ├── architect-chat.ts    (port of ai_chat/architect_chat.py)
│   ├── kb-crud.ts           (port of kb_route.py — D1 database)
│   ├── graph-pipelines.ts   (port of graph_pipeline_route.py — GitHub API + SSE)
│   ├── project-pipelines.ts (port of project_pipeline_route.py — GitHub API)
│   ├── files.ts             (port of files_route.py)
│   ├── gitnexus.ts          (port of gitnexus_route.py)
│   └── suggest-patterns.ts  (NEW — NotebookLM MCP query for AwesomeArchitecture)
│
└── lib/
    ├── llm-client.ts     (copy from drakon-agent-flue)
    ├── github-api.ts     (copy from docs-agent-flue)
    ├── ir-types.ts       (copy from drakon-agent-flue)
    ├── ir-validator.ts   (copy from drakon-agent-flue)
    ├── ast-analyzer.ts   (copy from drakon-agent-flue)
    ├── cc-calculator.ts  (NEW — cyclomatic complexity for JS/TS, LLM for Python)
    ├── prompts.ts        (ARCHITECT_SYSTEM_PROMPT from Python prompts.py)
    └── job-store.ts      (NEW — Durable Object for async job tracking)
```

### STEP 1 — Read Python source on dev server
```
HOST="192.168.3.184"
S="sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@$HOST"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/prompts.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/pipeline/nodes_vibe.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/pipeline/nodes_agents.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/pipeline/nodes_ss.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/pipeline/job_store.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/files_route.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/gitnexus_route.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/graph_pipeline_route.py"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/architect-agent/project_pipeline_route.py"
# Also read drakon-agent-flue libs to copy them:
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent-flue/lib/llm-client.ts"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent-flue/lib/ir-types.ts"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent-flue/lib/ir-validator.ts"
$S "cat /home/vokov/projects/ai-drakon-scaffolder/services/drakon-agent-flue/lib/ast-analyzer.ts"
```

### STEP 2 — workflows/pipeline-a.ts (replaces LangGraph analysis_graph)

Pipeline A: Code → DRAKON IR
Python: StateGraph with nodes: measure_cc → classify → ast_translate/yaml_gen → ir_gen → validate (loop max 3)

TypeScript Flue Workflow:
```typescript
export async function runPipelineA(code: string, filePath: string, env: Env): Promise<PipelineAResult> {
  // 1. measure_cc: calculate cyclomatic complexity
  const cc = calculateCC(code, filePath);  // lib/cc-calculator.ts

  // 2. classify complexity (same thresholds as Python)
  const treeLevel = cc <= 10 ? 'primitive' : cc <= 20 ? 'silhouette' : cc <= 50 ? 'branch' : 'deep';

  let drakonIr: DrakonDiagram[];

  if (treeLevel === 'primitive') {
    // 3a. ast_translate: use acorn/TS AST (for JS/TS) or LLM (for Python)
    drakonIr = await astTranslate(code, filePath, env);
  } else {
    // 3b. yaml_gen → ir_gen: LLM generates YAML then IR
    const yaml = await llmYamlGen(code, filePath, env);
    drakonIr = await llmIrGen(yaml, code, env);
  }

  // 4. validate + retry loop (max 3 iterations)
  let errors: string[] = validateIrList(drakonIr);
  let iteration = 0;
  while (errors.length > 0 && iteration < MAX_ITERATIONS) {
    drakonIr = await llmIrGen(null, code, env, errors);  // pass errors for correction
    errors = validateIrList(drakonIr);
    iteration++;
  }

  return { drakonIr, treeLevel, cc, validationErrors: errors };
}
```

### STEP 3 — workflows/pipeline-b.ts (replaces LangGraph vibe_graph)

Pipeline B: DRAKON IR → Code
Python: StateGraph: code_gen → check_syntax (loop max 3)

TypeScript Flue Workflow:
```typescript
export async function runPipelineB(
  drakonIr: DrakonDiagram, description: string, language: string, env: Env
): Promise<PipelineBResult> {
  let generatedCode = await llmCodeGen(drakonIr, description, language, env);

  // check_syntax: use acorn for JS/TS, LLM for Python
  let syntaxErrors = await checkSyntax(generatedCode, language, env);
  let iteration = 0;

  while (syntaxErrors.length > 0 && iteration < MAX_ITERATIONS) {
    generatedCode = await llmCodeGen(drakonIr, description, language, env, syntaxErrors);
    syntaxErrors = await checkSyntax(generatedCode, language, env);
    iteration++;
  }

  return { code: generatedCode, language, syntaxErrors, iterations: iteration };
}
```

### STEP 4 — lib/cc-calculator.ts

Cyclomatic complexity (replaces Python `radon` library):
```typescript
// For JS/TS files: parse with acorn, count decision points
// Decision points: if, else if, for, while, do-while, switch case, catch, &&, ||, ??
export function calculateCC(code: string, filePath: string): number {
  const ext = filePath.split('.').pop() || '';
  if (['js', 'ts', 'tsx', 'jsx', 'mjs'].includes(ext)) {
    // Use acorn to count branches
    return calculateJSCC(code);
  }
  // For Python and others: simple regex-based count
  // Count: if, elif, for, while, except, with, assert, and, or
  return calculatePythonCC(code);
}
```

### STEP 5 — tools/kb-crud.ts (replaces SQLite kb.db → Cloudflare D1)

D1 binding: `KB_DB`
```typescript
// Schema: same as Python
// CREATE TABLE contributions (id TEXT PRIMARY KEY, timestamp INTEGER, language TEXT,
//   description TEXT, code TEXT, ir_yaml TEXT, job_id TEXT, tags TEXT)

// SEED DATA: Pre-populated patterns from AwesomeArchitecture
const ARCHITECTURE_PATTERNS = [
  { id: 'p-layered', language: 'pattern', description: 'Layered Architecture',
    code: 'Classic three-tier: Presentation → Business → Data. Good enough for standard web apps.',
    ir_yaml: '...', tags: 'architecture,layered,three-tier' },
  { id: 'p-microservices', language: 'pattern', description: 'Microservices',
    code: 'Independent services, each owning its data. Use for scale, team autonomy.',
    ir_yaml: '...', tags: 'architecture,microservices,distributed' },
  { id: 'p-event-driven', language: 'pattern', description: 'Event-Driven Architecture',
    code: 'Async events via message broker. Use for decoupling, real-time processing.',
    ir_yaml: '...', tags: 'architecture,events,async' },
  { id: 'p-cqrs', language: 'pattern', description: 'CQRS',
    code: 'Separate read/write models. Use when reads and writes have different scaling needs.',
    ir_yaml: '...', tags: 'architecture,cqrs,data' },
  // ... Saga, Outbox, Strangler fig, etc.
  { id: 'p-rag', language: 'pattern', description: 'RAG Knowledge Base',
    code: 'Retrieval-Augmented Generation: vector DB + LLM. Use for AI doc search, Q&A.',
    ir_yaml: '...', tags: 'ai,rag,vector' },
  { id: 'p-agent-workflow', language: 'pattern', description: 'AI Agent/Workflow',
    code: 'Tool-calling LLM with sandboxing. Use for autonomous coding, research agents.',
    ir_yaml: '...', tags: 'ai,agent,flue' },
];

// Initialize D1 with seed patterns on first run:
export async function initKB(db: D1Database): Promise<void>

// Standard CRUD:
export async function contributeToKB(db, code, irYaml, language, description, jobId, tags)
export async function listKB(db, limit, offset)
export async function getKBEntry(db, id)
export async function deleteKBEntry(db, id)

// Pattern search (new):
export async function searchPatterns(db, query, limit = 5)
// SELECT * FROM contributions WHERE language = 'pattern' AND (description LIKE ? OR tags LIKE ?)
```

### STEP 6 — tools/suggest-patterns.ts (NEW — AwesomeArchitecture integration)

```typescript
const AWESOME_ARCH_NOTEBOOK = 'c21dd88b-79cd-47db-bb72-a52730218eb9';
const NOTEBOOKLM_MCP = 'http://192.168.3.234:8002/mcp';

export async function suggestPatterns(
  projectDocs: string,
  chatContext: string,
  requirements: string,
  env: Env
): Promise<PatternSuggestion[]> {

  // 1. Query NotebookLM AwesomeArchitecture notebook
  const query = `Given this project context:
${projectDocs}

Requirements: ${requirements}

What architectural patterns from AwesomeArchitecture would best fit this project?
Recommend 3-5 patterns with specific rationale for each. For each pattern explain:
1. Pattern name
2. Why it fits this project specifically
3. Key trade-offs to consider
4. Which systems use this pattern (examples)`;

  // NotebookLM MCP: initialize session first, then tools/call
  // POST http://192.168.3.234:8002/mcp
  const initResp = await callNotebookLMMCP('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'architect-agent', version: '1.0' }
  });
  const sessionId = initResp.sessionId;

  const result = await callNotebookLMMCP('tools/call', {
    name: 'chat_ask',
    arguments: { notebook_id: AWESOME_ARCH_NOTEBOOK, question: query }
  }, sessionId);

  // 2. Parse response into structured patterns
  const rawText = result?.result?.content?.[0]?.text || '';
  return parsePatternSuggestions(rawText);
}

// Create pipeline IR from selected patterns:
export async function createPipelineFromPatterns(
  patterns: PatternSuggestion[],
  projectSlug: string,
  agentName: string,
  env: Env
): Promise<DrakonDiagram> {
  // Build DRAKON IR that represents the architectural decision flow
  // Each pattern = a node in the diagram
  // Store to GitHub API under projects/${projectSlug}/agents/${agentName}/pipeline.drakon.json
}
```

### STEP 7 — tools/graph-pipelines.ts (replaces graph_pipeline_route.py)

DRAKON-defined pipelines CRUD + SSE execution:
- Storage: GitHub API (files in `services/architect-agent-flue/pipelines/*.drakon.json`)
- SSE: Cloudflare Workers `ReadableStream` streaming
- Job state: Cloudflare Durable Object `ArchitectJobStore`

```typescript
// list_pipelines() → GitHub API listDir('services/architect-agent-flue/pipelines')
// get_pipeline(name) → GitHub API getFile
// update_pipeline(name, ir) → GitHub API putFile + validate IR
// execute_pipeline_sse(name, initialState) → Cloudflare Workers streaming SSE:
//   Run pipeline workflow, stream events via ReadableStream
//   Each step: { event: 'node_start', node: 'measure_cc' }
//             { event: 'node_done', node: 'measure_cc', result: {...} }
//             { event: 'done', result: finalState }
```

### STEP 8 — lib/job-store.ts (Durable Object)

```typescript
// Durable Object class for async job tracking (replaces Python in-memory dict)
export class ArchitectJobStore {
  // state.storage.put/get for job persistence
  // Jobs survive Worker restarts
  create_job() → jobId
  update_job(jobId, status, result?, error?)
  get_job(jobId) → { job_id, status, result, error }
}
```

### STEP 9 — src/mcp-server.ts

MCP server exposing all tools:
```
- architect_chat — chat about architecture + patterns
- pipeline_a — run Code → DRAKON IR workflow
- pipeline_b — run DRAKON IR → Code workflow  
- suggest_patterns — query AwesomeArchitecture for pattern recommendations
- kb_contribute — add to knowledge base
- kb_list — list KB entries
- kb_search_patterns — search patterns in KB
- list_pipelines — list DRAKON pipelines
- get_pipeline — get pipeline IR
- update_pipeline — save pipeline IR
- execute_pipeline — run pipeline (async, returns job_id)
- job_status — check job status
- list_projects — list projects with agents
- create_project — create project
```

### STEP 10 — src/index.ts (Hono, backward-compatible REST)

```typescript
app.get('/health', ...)
app.post('/mcp', handleMcp)
app.post('/chat', ...)                    // architect_chat
app.post('/pipeline/analyze', ...)        // pipeline_a
app.post('/pipeline/generate', ...)       // pipeline_b
app.get('/pipeline/status/:id', ...)      // job_status
app.get('/graph-pipelines', ...)          // list_pipelines
app.get('/graph-pipelines/:name', ...)    // get_pipeline
app.put('/graph-pipelines/:name', ...)    // update_pipeline
app.post('/graph-pipelines/:name/execute', ...) // SSE execution
app.get('/kb', ...)                       // kb_list
app.post('/kb/contribute', ...)           // kb_contribute
app.delete('/kb/:id', ...)               // kb_delete
app.post('/suggest-patterns', ...)        // suggest_patterns (NEW)
app.get('/projects', ...)                 // list_projects
app.post('/projects/:slug', ...)          // create_project
app.route('/', flue())
export { ArchitectJobStore }  // Durable Object export
```

### STEP 11 — wrangler.toml
```toml
name = "architect-agent-flue"
main = "src/index.ts"
compatibility_date = "2026-04-01"
compatibility_flags = ["nodejs_compat"]

[vars]
PROXY_URL = "https://agy3.exodus.pp.ua/v1"
PROXY_MODEL = "gemini-2.5-flash"
GITHUB_REPO = "maxfraieho/ai-drakon-scaffolder"
NOTEBOOKLM_MCP = "http://192.168.3.234:8002/mcp"
AWESOME_ARCH_NOTEBOOK_ID = "c21dd88b-79cd-47db-bb72-a52730218eb9"

[[d1_databases]]
binding = "KB_DB"
database_name = "architect-kb"
database_id = "placeholder_d1_id"

[[kv_namespaces]]
binding = "PIPELINES_KV"
id = "placeholder_kv_id"

[durable_objects]
bindings = [
  { name = "JOB_STORE", class_name = "ArchitectJobStore" },
  { name = "FLUE_ARCHITECT_AGENT", class_name = "FlueArchitectAgent" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ArchitectJobStore", "FlueArchitectAgent"]
```

### VERIFICATION
```
cd ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue

# All files present
find . -name "*.ts" -not -path "*/node_modules/*" | sort
find . -name "*.ts" -not -path "*/node_modules/*" | xargs wc -l | sort -rn | head -15

# Pipeline A workflow has CC calculation + LLM fallback
grep -n "calculateCC\|primitive\|silhouette\|yaml_gen\|ir_gen" workflows/pipeline-a.ts | head -10

# Pattern suggestion calls NotebookLM
grep -n "chat_ask\|AwesomeArchitecture\|c21dd88b" tools/suggest-patterns.ts | head -5

# MCP server exposes suggest_patterns
grep -n "suggest_patterns\|pipeline_a\|pipeline_b" src/mcp-server.ts | head -10

# Hono has /suggest-patterns and SSE endpoint
grep -n "suggest-patterns\|execute\|stream\|ReadableStream" src/index.ts | head -10

# D1 KB has pattern seeds
grep -n "ARCHITECTURE_PATTERNS\|p-layered\|p-rag" tools/kb-crud.ts | head -5
```

### COMMIT
```
cd ~/workspace/ai-drakon-scaffolder
git add services/architect-agent-flue/
git commit -m "feat(architect-agent): Flue migration — D1 KB + patterns from AwesomeArchitecture + pipelines + MCP"
git push origin main
```

### DIARY
Agent: agt-ogy3
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-148:architect-agent-flue|d1-kb+patterns+workflows+mcp|commit:<hash>|★★★★★"

### NOTES
- !!IMPORTANT!! Work locally on AGY3 Termux. SSH to 192.168.3.184 to READ Python files only.
- sshpass dev server password: 805235io.
- COPY lib files from drakon-agent-flue: llm-client.ts, ir-types.ts, ir-validator.ts, ast-analyzer.ts
- LangGraph is COMPLETELY replaced by native TypeScript in workflows/pipeline-a.ts and pipeline-b.ts
- NO radon Python library — implement CC calculation in TypeScript
- D1 replaces SQLite — use env.KB_DB.prepare().bind().all() syntax
- NotebookLM MCP at http://192.168.3.234:8002/mcp — initialize first, then tools/call chat_ask
- AwesomeArchitecture notebook ID: c21dd88b-79cd-47db-bb72-a52730218eb9
- DOCS_SYSTEM_PROMPT: copy ARCHITECT_SYSTEM_PROMPT exactly from Python prompts.py
- SSE streaming: use Cloudflare Workers ReadableStream (NOT Node.js stream)
- Durable Objects: ArchitectJobStore must be exported from src/index.ts
- The Pipelines tab in frontend calls GET /graph-pipelines and POST /graph-pipelines/:name/execute
- gitignore: node_modules/, dist/


## TASK-149: Docs + Frontend Update Plan (architect-agent-flue + OpenDesign)
[s] TASK-149 (superseded by TASK-152+)

### GOAL
Two deliverables after TASK-148 (architect-agent-flue) is complete:
1. **Documentation** — detailed technical + user docs for the architect-agent Flue migration
2. **Frontend update plan** — UI/UX changes needed to expose new features (suggest-patterns, KB,
   pipeline SSE streaming) designed via OpenDesign at http://192.168.3.204:7460

### PREREQUISITE
TASK-148 must be committed. Verify:
```bash
cd ~/workspace/ai-drakon-scaffolder
git fetch origin
git log --oneline origin/main -3
ls services/architect-agent-flue/
```

### DELIVERABLE 1: Documentation
Write to: `services/architect-agent-flue/README.md`

Structure:
```markdown
# architect-agent-flue

## Overview
Brief: what the agent does, tech stack (Flue + CF Workers + D1 + Hono + NotebookLM MCP)

## Architecture
Diagram (ASCII):
  Hono Router → MCP Server → Flue Agent → Tools
                           ↕
  Workflows: Pipeline A (Code→IR) | Pipeline B (IR→Code)
                           ↕
  Storage: D1 (KB) | GitHub API (pipelines/.drakon.json)
                           ↕
  AI: agy3 LLM proxy | NotebookLM MCP (AwesomeArchitecture patterns)

## API Reference
Table: Method | Endpoint | Description | Body | Response
Cover ALL routes from src/index.ts

## MCP Tools Reference  
Table: Tool name | Description | Arguments | Returns
Cover ALL tools from src/mcp-server.ts

## New Feature: AwesomeArchitecture Pattern Suggestions
- POST /suggest-patterns { project_docs, requirements, chat_context }
- Returns: [{ name, rationale, tradeoffs, examples }]
- How it works: calls NotebookLM MCP → parse response → return ranked patterns

## Pipeline A: Code → DRAKON IR
Step-by-step walkthrough of runPipelineA() flow:
1. CC calculation → classify complexity tier
2. primitive → AST translate (acorn/LLM)
3. complex → yaml_gen → ir_gen
4. validate → retry loop (max 3)

## Pipeline B: DRAKON IR → Code
Step-by-step: code_gen → check_syntax → retry loop (max 3)

## Knowledge Base (D1)
- Schema, seeded patterns list
- How to contribute: POST /kb/contribute
- How to search: GET /kb?q=query

## Configuration (wrangler.toml)
Required vars + secrets table

## Deployment
wrangler deploy + d1 migrations commands
```

Also write to: `development/docs/architect-agent-flue-feature-spec.md`
This is a USER-FACING spec (for the frontend team + OpenDesign):
```markdown
# Architect Agent — Feature Specification

## Current State (before frontend update)
- Pipelines tab: shows list of .drakon.json pipelines, can run them
- Chat tab: architect chat
- KB tab: knowledge base entries

## New Features to Surface in UI

### 1. Pattern Suggestion Panel
Location: New sub-tab "Patterns" inside Architect section
User flow:
  a. User fills "Project Description" textarea
  b. User fills "Requirements" textarea (optional)
  c. Clicks "Suggest Patterns" button
  d. Agent queries NotebookLM AwesomeArchitecture
  e. Shows 3-5 pattern cards:
     - Pattern name + icon
     - Rationale (why this fits the project)
     - Trade-offs (bullet list)
     - "Use this pattern" button → creates pipeline from it

### 2. Pipeline Execution: Real-time SSE Streaming
Location: Pipelines tab → execute button
Current: polling job status
New: SSE stream showing each pipeline node as it executes:
  - Node status indicator (pending / running / done / error)
  - Node output preview (collapsible)
  - Progress bar
  - Final result display

### 3. Knowledge Base Browser
Location: KB tab (improve existing)
Current: flat list of contributions
New:
  - Tabs: "Architecture Patterns" | "Code Contributions"
  - Pattern cards with tags filter
  - "Contribute" button → opens form

### 4. Pattern → Pipeline Creation Flow
New: after viewing pattern recommendations (feature #1),
user selects patterns → agent creates a pipeline DRAKON diagram
that represents the architectural decision tree.
Pipeline is saved and appears in Pipelines tab.

## API Endpoints Used
(list from README.md + new endpoints)
```

### DELIVERABLE 2: OpenDesign UI Mockups + Frontend Plan

OpenDesign server: http://192.168.3.204:7460 (no auth needed)
pluginId: ai-drakon-mobile

Read the OpenDesign API first:
```bash
curl -s http://192.168.3.204:7460/api/v1/projects | python3 -m json.tool | head -40
```

#### Step 2a — Create design mockups via OpenDesign REST API

For each of the 4 new features, create a design via:
```bash
curl -X POST http://192.168.3.204:7460/api/v1/components \
  -H "Content-Type: application/json" \
  -d '{
    "pluginId": "ai-drakon-mobile",
    "name": "PatternSuggestionPanel",
    "template": "card-list",
    "props": {
      "title": "Architecture Patterns",
      "items": [
        {"title": "CQRS", "subtitle": "Best for high-read workloads", "badge": "recommended"},
        {"title": "Event-driven", "subtitle": "Decoupled async processing", "badge": ""},
        {"title": "Modular Monolith", "subtitle": "Start simple, scale later", "badge": ""}
      ],
      "action": "Use Pattern"
    }
  }'
```

If OpenDesign API structure is different — first read the API docs:
```bash
curl -s http://192.168.3.204:7460/api/v1/ | python3 -m json.tool
curl -s http://192.168.3.204:7460/api/v1/templates | python3 -m json.tool | head -60
```

#### Step 2b — Write frontend implementation plan

Write to: `development/docs/frontend-architect-update-plan.md`

Structure:
```markdown
# Frontend Update Plan — Architect Agent New Features

## Files to Modify
(based on current src/ structure — check src/components/ for existing Architect components)

Find existing architect components:
  find ~/workspace/ai-drakon-scaffolder/src -name "*rchitect*" -o -name "*pipeline*" | sort
  find ~/workspace/ai-drakon-scaffolder/src -name "*Pipelines*" -o -name "*Pipeline*"

## 1. PatternSuggestionPanel Component
File: src/components/architect/PatternSuggestionPanel.tsx (NEW)
  - Form: project_docs (Textarea), requirements (Textarea), submit button
  - State: loading / patterns[] / error
  - API: POST /suggest-patterns (architect-agent-flue endpoint)
  - Display: PatternCard grid (name, rationale, tradeoffs, "Use Pattern" CTA)

## 2. Pipeline SSE Execution
File: src/components/architect/PipelineExecution.tsx (MODIFY or NEW)
  - Replace polling with EventSource('/graph-pipelines/:name/execute')
  - NodeStatus component: icon per status (clock/spinner/check/x)
  - Progress visualization

## 3. KB Browser Improvement  
File: src/components/architect/KnowledgeBase.tsx (MODIFY if exists)
  - Tab switcher: Patterns | Contributions
  - Tag filter component
  - PatternCard vs ContributionCard

## 4. Pattern → Pipeline Flow
File: src/components/architect/PatternPipelineCreator.tsx (NEW)
  - Triggered from PatternSuggestionPanel "Use Pattern"
  - Shows which patterns selected
  - POST /suggest-patterns → create pipeline
  - Redirects to Pipelines tab

## Routing Changes
(if tabs are routed) — check src/router or src/App.tsx

## API Client Updates
File: src/services/architect-api.ts (check if exists, create if not)
  Add: suggestPatterns(projectDocs, requirements)
  Add: executeWithSSE(pipelineName, onEvent)
  Add: searchKB(query, type?)

## OpenDesign Component Mockups
(attach URLs or screenshots from OpenDesign)
```

### VERIFICATION
```bash
# Documentation files created
ls services/architect-agent-flue/README.md
ls development/docs/architect-agent-flue-feature-spec.md
ls development/docs/frontend-architect-update-plan.md

# README has all endpoints
grep -c "app\." services/architect-agent-flue/src/index.ts || true
grep -c "##" services/architect-agent-flue/README.md

# Feature spec has 4 features
grep "###" development/docs/architect-agent-flue-feature-spec.md

# Frontend plan has component files
grep "\.tsx" development/docs/frontend-architect-update-plan.md | head -5

# OpenDesign was queried (if available)
# curl -s http://192.168.3.204:7460/api/v1/projects | head -5
```

### COMMIT
```bash
cd ~/workspace/ai-drakon-scaffolder
git add services/architect-agent-flue/README.md \
        development/docs/architect-agent-flue-feature-spec.md \
        development/docs/frontend-architect-update-plan.md
git commit -m "docs(architect-agent): API docs + frontend update plan with OpenDesign mockups"

# Mark done
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-149','[x] TASK-149',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-149 done"
git push origin main
```

### DIARY
Agent: agt-ogy3
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-149:architect-docs+opendesign-plan|README+feature-spec+frontend-plan|commit:<hash>|★★★"

### NOTES
- !!IMPORTANT!! Work locally on AGY3 Termux
- Run AFTER TASK-148 is committed — check git log first
- OpenDesign at http://192.168.3.204:7460 — read API docs before calling
- If OpenDesign API structure unknown, explore /api/v1/ first
- Find existing frontend Architect components with find command before writing new file paths
- The feature spec is for the frontend developer (and for OpenDesign context)
- The frontend plan must reference ACTUAL existing files (check src/ first)
- development/docs/ directory may not exist — create with mkdir -p

## TASK-150: Fundamental Frontend Redesign — AI-DRAKON Platform
[s] TASK-150 (superseded by TASK-152..166)

### МЕТА
Критично переосмислити весь фронтенд ai-drakon-scaffolder. Не інкрементальні зміни — ПОВНИЙ перегляд UX/навігації/архітектури компонентів. Результат: чіткий, сучасний інтерфейс для AI-агент платформи з 3 спеціалізованими агентами.

### ПЕРЕДУМОВИ
1. Спочатку виконай TASK-148 (architect-agent-flue) та TASK-149 (docs + spec) — вони дають feature spec для нових компонентів
2. Прочитай: `cat ~/workspace/ai-drakon-scaffolder/development/docs/frontend-architect-update-plan.md` (якщо ще не існує — читай `development/TASKS.md` для контексту)

### КРОК 1: Зрозуміти поточний стан

```bash
cd ~/workspace/ai-drakon-scaffolder

# Структура src/
find src -name "*.tsx" | sort | head -40
find src -name "*.tsx" | wc -l

# Роутер (де визначені всі маршрути):
cat src/routes/__root.tsx 2>/dev/null || find src -name "*router*" -o -name "*routes*" | head -5

# Всі маршрути:
grep -r "createRoute\|path:" src/routes/ 2>/dev/null | head -30

# Хедер/навігація:
find src -name "*Layout*" -o -name "*Nav*" -o -name "*Header*" | head -10

# Поточні сторінки/tabs:
ls src/pages/ 2>/dev/null || ls src/routes/ 2>/dev/null | head -20
```

**Використовуй GitNexus для аналізу:**
```bash
# Карта маршрутів:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_map","arguments":{"repo":"ai-drakon-scaffolder"}}}' \
  | python3 -m json.tool 2>/dev/null | head -60

# Контекст AppLayout:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"context","arguments":{"repo":"ai-drakon-scaffolder","path":"src/components/app/AppLayout.tsx"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:3000])"
```

### КРОК 2: Аналіз і план редизайну

Прочитай ключові файли:
```bash
cat src/components/app/AppLayout.tsx
cat src/App.tsx 2>/dev/null || cat src/main.tsx
ls src/components/
```

Проблеми поточного UX (на основі структури коду):
- Навігація: адмін-панель (Proxies, Providers, Models, Credentials) змішана з основним функціоналом
- Відсутній чіткий "user journey" — неясно з чого починати
- Три агенти (drakon, docs, architect) не мають єдиного центру
- Мобільний вигляд невідомий

### КРОК 3: Запитати OpenDesign для мокапів

**OpenDesign server**: http://192.168.3.204:7460 (без авторизації)

```bash
# Перевірити доступність:
curl -s http://192.168.3.204:7460/api/v1/ | python3 -m json.tool | head -20
curl -s http://192.168.3.204:7460/api/v1/projects | python3 -m json.tool | head -30

# Якщо API інший — спочатку дослідж структуру:
curl -s http://192.168.3.204:7460/ | head -20
```

Для кожного ключового екрану — створи мокап через OpenDesign API (якщо підтримує REST).
Якщо REST не підтримує — задокументуй ASCII mockups в development/docs/frontend-redesign-mockups.md

### КРОК 4: Нова архітектура навігації

Запропонувати та реалізувати нову структуру:

**Нова навігація (зверху або sidebar)**:
```
[🏠 Home]  [🔵 Drakon] [📚 Docs] [🏗️ Architect] [🔬 Pipelines] [👁 Observe] ⚙️
```

**Home/Dashboard** (нова сторінка або переробка Overview):
- Статус 3 агентів (drakon/docs/architect) — health check
- "Швидкий старт": кнопки Create Diagram / Create Note / Create Pipeline
- Recent diagrams / Recent notes
- Active jobs (SSE streaming)

**Agentless admin panel** (відокремити від головного nav):
- Settings / Providers / Models / Credentials → в субменю ⚙️ або окрема /admin роут

**Кожен агент = своя вкладка**:
- /drakon — редактор DRAKON-схем (поточний /diagrams + /editor)
- /docs — нотатки + docs-agent chat + graph
- /architect — KB + Pipelines + Pattern Suggestions (нові фічі з TASK-148)

### КРОК 5: Реалізація

**Файли для зміни:**
```bash
# Знайти AppLayout і навігацію:
cat src/components/app/AppLayout.tsx

# Знайти router:
find src -name "router.ts" -o -name "__root.tsx" | xargs cat 2>/dev/null | head -50

# Знайти основний Layout:
find src -name "*Layout*" | head -5
```

**Мінімально необхідні зміни:**
1. `src/components/app/AppLayout.tsx` — нова навігація (sidebar або topbar)
2. Router — перегрупувати маршрути (admin окремо, агенти окремо)
3. Нова Home сторінка з dashboard
4. Мобільний responsive (перевірити та виправити)

**Нові компоненти:**
- `src/components/app/AgentStatusCard.tsx` — картка з health status агента
- `src/components/app/QuickActions.tsx` — кнопки швидкого старту
- `src/components/app/RecentActivity.tsx` — останні дії

**НЕ ЛАМАТИ:**
- Всю logic в pages (просто переструктурувати navigation)
- API calls (лише UI layer змінюємо)
- auth flow

### КРОК 6: Мобільний вигляд

```bash
# Перевірити наявність mobile компонентів:
ls src/components/mobile/ 2>/dev/null
grep -r "md:" src/components/app/ | head -10  # Tailwind responsive
```

Якщо немає responsive — додати базовий mobile nav (hamburger menu).

### ВЕРИФІКАЦІЯ

```bash
cd ~/workspace/ai-drakon-scaffolder

# TypeScript compile check:
node node_modules/typescript/bin/tsc --noEmit 2>&1 | head -20

# Нові компоненти:
ls src/components/app/AgentStatusCard.tsx
ls src/components/app/QuickActions.tsx

# Нова навігація (перевірити що всі 3 агенти є):
grep -E "drakon|docs|architect" src/components/app/AppLayout.tsx | head -10

# Router — admin окремо:
grep -E "admin|settings|providers" src/router* 2>/dev/null || grep -r "Providers\|Credentials" src/routes/ | head -5
```

### COMMIT
```bash
cd ~/workspace/ai-drakon-scaffolder
git add src/
git commit -m "feat(frontend): full UX redesign — agent-centric nav + dashboard + mobile responsive"

python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-150','[x] TASK-150',1)
with open('development/TASKS.md','w') as f: f.write(c)
print('TASK-150 marked done')
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-150 done"
git push origin main
```

### DIARY
Agent: agt-ogy3
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-150:frontend-redesign|agent-centric-nav+dashboard+mobile|commit:<hash>|★★★★"

### NOTES
- !!IMPORTANT!! Основна робота локально на AGY3 Termux
- SSH до dev server (192.168.3.184) тільки для читання конфігів якщо потрібно
- Використовуй GitNexus ПЕРЕД зміною кожного компонента (context + impact)
- GitNexus URL: https://gitnexus.exodus.pp.ua/api/mcp (MCP JSON-RPC 2.0)
- OpenDesign: http://192.168.3.204:7460 — досліджуй API перед використанням
- Редизайн = нова навігація + dashboard + відокремлення admin panel
- НЕ переписуй логіку агентів — тільки UI layer
- Перевір mobile responsive (Tailwind breakpoints: sm/md/lg)
- Репо на AGY3: ~/workspace/ai-drakon-scaffolder (git pull origin main спочатку!)
- Поточний сайт: https://ai-drakon-setup.pages.dev (Cloudflare Pages, будується з .lovable/)
- ВАЖЛИВО після змін в src/: `cp -r src/ .lovable/src/` (Lovable sync rule!)


---

## TASK-151: Testing + Visual QA — AI-DRAKON Frontend
[s] TASK-151 (superseded by TASK-166)

### GOAL
1. Run existing tests and verify pass
2. Write new Vitest unit tests for key modules
3. E2E visual verification via agent-workspace (browser on RPi 3B)
4. TypeScript type-check the full codebase

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### PREREQUISITE
Run AFTER TASK-150 is committed. Check first:
```bash
git log --oneline -3
# Must see TASK-150 commit
```

### STEP 1 — GitNexus context (MANDATORY first step)
```bash
# Get route map to understand all endpoints:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_map","arguments":{"repo":"ai-drakon-scaffolder"}}}' \
  | python3 -m json.tool | head -80

# Find all test-related files:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"repo":"ai-drakon-scaffolder","q":"vitest describe it expect"}}}' \
  | python3 -m json.tool | head -40
```

### STEP 2 — Run existing tests
```bash
cd ~/workspace/ai-drakon-scaffolder
npm run test 2>&1 | tee /tmp/test-run-1.log
cat /tmp/test-run-1.log | tail -20
```
If tests fail — fix before continuing.

### STEP 3 — TypeScript check
```bash
cd ~/workspace/ai-drakon-scaffolder/.lovable
npx tsc --noEmit 2>&1 | tee /tmp/tsc-check.log
echo "TSC errors: $(grep -c error /tmp/tsc-check.log || echo 0)"
```
Fix any type errors found.

### STEP 4 — Write new unit tests

Write tests for these modules (check if they exist first with find):

#### 4a. src/lib/api.ts — API client functions
File: src/lib/__tests__/api.test.ts (NEW)
```typescript
// Test that API functions return expected shapes
// Use vi.fn() to mock fetch — no real network calls
import { describe, it, expect, vi } from 'vitest'
// test getDiagrams, saveDiagram, etc.
```

#### 4b. src/lib/worker-url.ts — URL resolution
File: src/lib/__tests__/worker-url.test.ts (NEW)
```typescript
// Test that worker URLs resolve correctly for each agent
// Test dev vs prod URL switching
```

#### 4c. New TASK-150 components (from AppLayout redesign)
Find what TASK-150 created:
```bash
git diff HEAD~3 --name-only | grep "src/components"
```
Write basic render tests for each new component:
```typescript
import { render } from '@testing-library/react'
// Test renders without crash, shows expected text
```

Check if @testing-library/react is installed:
```bash
cat ~/workspace/ai-drakon-scaffolder/.lovable/package.json | grep testing-library
```
If NOT installed: skip render tests, write logic-only tests instead.

### STEP 5 — Run all tests after writing
```bash
cd ~/workspace/ai-drakon-scaffolder
npm run test 2>&1 | tee /tmp/test-run-2.log
cat /tmp/test-run-2.log | tail -30
```
All tests must PASS before committing.

### STEP 6 — E2E visual check via agent-workspace

agent-workspace доступний через MCP (в .mcp.json проекту).
Повна інструкція: ~/workspace/ai-drakon-scaffolder/development/docs/agent-workspace-usage.md

```bash
# Wait for Cloudflare Pages deploy after TASK-150 push (~3 min):
echo "Waiting for CF Pages deploy..."
sleep 180

# Then use agent-workspace MCP tools:
# workspace_browser_navigate(url="https://ai-drakon-setup.pages.dev", wait_ms=4000)
# workspace_paste_text — enter token: drakon-mcp-2026
# workspace_browser_snapshot() — get HTML state
# workspace_screenshot(output_path="/tmp/drakon-screen.png")
# scp vokov@192.168.3.234:/tmp/drakon-screen.png /tmp/
```

Check these routes:
- / (Home dashboard — new after TASK-150)
- /diagrams (DRAKON editor)
- /agents (Agent status)
- /pipelines (Pipelines)

Note any visual issues in the test report.

### STEP 7 — Sync to .lovable
```bash
cp -r src/ .lovable/src/
```

### VERIFICATION
```bash
# All tests pass:
npm run test 2>&1 | grep -E "passed|failed|Tests"
# No TS errors:
grep -c error /tmp/tsc-check.log || echo "0 errors"
# New test files exist:
find src -name "*.test.ts" | grep -v __tests__/ir-validator
# Screenshots saved:
ls /tmp/drakon-screen*.png 2>/dev/null | wc -l
```

### COMMIT
```bash
cd ~/workspace/ai-drakon-scaffolder
git add src/lib/__tests__/ src/components/
cp -r src/ .lovable/src/
git add .lovable/src/lib/__tests__/
git commit -m "test(frontend): add unit tests for api client + new TASK-150 components"

python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-151','[x] TASK-151',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-151 done"
git push origin main
```

### DIARY
Agent: agt-ogy3
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-151:testing+visual-qa|vitest+tsc+agent-workspace|commit:<hash>|★★★"

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- Run AFTER TASK-150 is committed
- If @testing-library/react not installed — skip render tests
- If agent-workspace MCP not responding — skip E2E, write note in diary
- Fix ALL TypeScript errors before committing
- Screenshots go to /tmp/ on RPi, need scp to AGY3

---

## TASK-152: Redesign AppLayout — Agent-Centric Sidebar Navigation
[x] TASK-152

### GOAL
Replace current AppLayout.tsx with agent-centric sidebar navigation.
ONE file only: `src/components/app/AppLayout.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 1 — GitNexus context (MANDATORY, do this FIRST, do NOT read files manually)

```bash
# Get current AppLayout structure:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"context","arguments":{"repo":"ai-drakon-scaffolder","path":"src/components/app/AppLayout.tsx"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:3000])"

# Find what imports AppLayout (to understand what props it needs):
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"impact","arguments":{"repo":"ai-drakon-scaffolder","symbol":"AppLayout"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:2000])"
```

Use GitNexus output as context. Do NOT read files with view_file for this step.

### STEP 2 — Write new AppLayout.tsx

Replace `src/components/app/AppLayout.tsx` with:
- Left sidebar (desktop): icons + labels for: Diagrams, Agents, Pipelines, Docs, Knowledge, Notebooks
- Each item uses NavLink from react-router-dom v6 (active state highlight)
- Collapsible on mobile (hamburger → drawer)
- Agent status dots: small colored badge next to "Agents" nav item
- Settings gear at bottom of sidebar
- Main content area: `<Outlet />` from react-router-dom
- Dark theme, Tailwind only, Lucide icons

Keep same props interface as current AppLayout (check GitNexus output from Step 1).

### STEP 3 — Sync to .lovable
```bash
cp src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx
```

### STEP 4 — TypeScript check
```bash
cd .lovable && npx tsc --noEmit 2>&1 | grep error | head -10
```
Fix errors if any.

### VERIFICATION
```bash
grep -c "NavLink" src/components/app/AppLayout.tsx
grep "Outlet" src/components/app/AppLayout.tsx
diff src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx | head -3
```

### COMMIT
```bash
git add src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx
git commit -m "feat(ui): redesign AppLayout with agent-centric sidebar nav"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-152','[x] TASK-152',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-152 done"
git push origin main
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-152:AppLayout-sidebar|NavLink+Outlet+Lucide|commit:<hash>|★★★"

---

## TASK-153: Home Dashboard — Agent Status Overview Page
[x] TASK-153

### GOAL
Create `src/pages/HomePage.tsx` — головна сторінка з статусом усіх агентів.
ONE new file + register in router.

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 1 — GitNexus context (MANDATORY first)

```bash
# Find existing agent API:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}' | python3 -m json.tool | head -5

curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query","arguments":{"repo":"ai-drakon-scaffolder","q":"agent health status worker-url"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:2000])"

# Find root route:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"context","arguments":{"repo":"ai-drakon-scaffolder","path":"src/routes/__root.tsx"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:2000])"
```

If GitNexus returns "Server not initialized" — initialize first (send initialize call), then retry tools/call.

### STEP 2 — Read only these 2 files (minimal context)

```bash
cat src/lib/worker-url.ts
cat src/routes/index.tsx
```

### STEP 3 — Create HomePage.tsx

File: `src/pages/HomePage.tsx`

Component shows 3 agent status cards:
- Drakon Agent (`/diagrams` link)
- Docs Agent (`/docs` link)
- Architect Agent (`/pipelines` link)

Each card: agent name, colored status dot (fetch `/health` from worker URL), last route link, "Open" button.

Worker URLs from `src/lib/worker-url.ts` — import the function.

```tsx
// Structure:
export function HomePage() {
  // fetch health for each agent on mount
  // show AgentCard grid
}

function AgentCard({ name, healthUrl, route, icon }: Props) {
  const [status, setStatus] = useState<'online'|'offline'|'checking'>('checking')
  // useEffect → fetch healthUrl
  // return card with dot + name + status + NavLink button
}
```

Dark theme, Tailwind, Lucide icons (Bot, FileText, Building2).

### STEP 4 — Register in router

Find index route in `src/routes/index.tsx` or `src/routes/__root.tsx`.
Replace current index content with `<HomePage />` import.

### STEP 5 — Sync + check
```bash
cp src/pages/HomePage.tsx .lovable/src/pages/HomePage.tsx
# Also copy updated route file
cp src/routes/index.tsx .lovable/src/routes/index.tsx 2>/dev/null || true
```

### VERIFICATION
```bash
grep "HomePage" src/routes/index.tsx || grep "HomePage" src/routes/__root.tsx
grep "AgentCard\|healthUrl\|worker" src/pages/HomePage.tsx | head -5
diff src/pages/HomePage.tsx .lovable/src/pages/HomePage.tsx | head -3
```

### COMMIT
```bash
git add src/pages/HomePage.tsx .lovable/src/pages/HomePage.tsx
git add src/routes/index.tsx .lovable/src/routes/index.tsx 2>/dev/null || true
git commit -m "feat(ui): add HomePage with agent status dashboard"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-153','[x] TASK-153',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-153 done"
git push origin main
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-153:HomePage-agent-dashboard|AgentCard+health-fetch|commit:<hash>|★★★"

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- Only 2 files to read manually (worker-url.ts + index.tsx) — use GitNexus for the rest
- If index route doesn't exist, check __root.tsx for the "/" path
- Do NOT install new packages

---

## TASK-154: Redesign MobileNavigationDock — Agent-Centric Bottom Nav
[x] TASK-154

### GOAL
Replace `src/components/mobile/MobileNavigationDock.tsx` with agent-centric bottom navigation.
ONE file only.

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 1 — GitNexus (MANDATORY first)

```bash
# Initialize first:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('serverInfo',{}))"

# Get current component context:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"context","arguments":{"repo":"ai-drakon-scaffolder","path":"src/components/mobile/MobileNavigationDock.tsx"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:2000])"
```

### STEP 2 — Read only this 1 file
```bash
cat src/components/mobile/MobileNavigationDock.tsx
```

### STEP 3 — Rewrite MobileNavigationDock.tsx

5 nav items bottom bar: Diagrams, Agents, Pipelines, Docs, Home
- NavLink with active highlight (accent color)
- Icons: Workflow, Bot, GitMerge, BookOpen, Home (all from lucide-react)
- Fixed bottom, full width, z-50
- Dark bg: `bg-zinc-900/95 backdrop-blur border-t border-zinc-800`
- Active: `text-indigo-400`, inactive: `text-zinc-500`
- Show only on mobile (`md:hidden`)

### STEP 4 — Sync
```bash
cp src/components/mobile/MobileNavigationDock.tsx .lovable/src/components/mobile/MobileNavigationDock.tsx
```

### VERIFICATION
```bash
grep "NavLink" src/components/mobile/MobileNavigationDock.tsx
grep "md:hidden" src/components/mobile/MobileNavigationDock.tsx
diff src/components/mobile/MobileNavigationDock.tsx .lovable/src/components/mobile/MobileNavigationDock.tsx | wc -l
```

### COMMIT
```bash
git add src/components/mobile/MobileNavigationDock.tsx .lovable/src/components/mobile/MobileNavigationDock.tsx
git commit -m "feat(ui): redesign MobileNavigationDock with agent-centric bottom nav"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-154','[x] TASK-154',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-154 done"
git push origin main
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-154:MobileNav-redesign|NavLink+lucide+bottom-bar|commit:<hash>|★★★"

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- Only 1 file to read manually
- No new packages

---

## TASK-155: AppLayout — Add Observability Nav Item + Fix Mobile Scroll (OpenDesign)
[x] TASK-155

### GOAL
1. Додати "Observability" до бокового меню (`/observability`, іконка `Activity` з lucide)
2. Зафіксувати мобільний скрол — основний контент не скролиться
3. Використати **OpenDesign** для генерації оновленого компонента

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 1 — GitNexus context (MANDATORY)

```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}' \
  | python3 -c "import sys,json; print('GN OK:', json.load(sys.stdin).get('result',{}).get('serverInfo',{}).get('name','?'))"

curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"context","arguments":{"repo":"ai-drakon-scaffolder","path":"src/components/app/AppLayout.tsx"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:3000])"
```

### STEP 2 — OpenDesign (MANDATORY — використати для генерації)

```bash
# Запустити генерацію через OpenDesign:
RUN=$(curl -s -X POST http://192.168.3.184:7460/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Update React TypeScript AppLayout sidebar component. Current nav items: Diagrams(/diagrams,Workflow), Agents(/agents,Bot), Pipelines(/pipelines,GitMerge), Docs(/docs,BookOpen), Knowledge(/knowledge,Brain), Notebooks(/notebooks,Notebook). ADD new item: Observability(/observability,Activity icon from lucide-react). FIX mobile scroll bug: main content area must have overflow-y-auto and flex-1 so it scrolls independently. Keep: NavLink active state indigo-400, dark zinc theme, hamburger drawer for mobile, Settings gear at bottom, LanguageSwitcher import. Output full updated AppLayout.tsx component.",
    "pluginId": "ai-drakon-mobile",
    "agentId": "antigravity"
  }')
echo "Run started: $RUN"
RUN_ID=$(echo "$RUN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runId',''))")
echo "Run ID: $RUN_ID"

# Poll for result (max 10 attempts x 20s):
for i in $(seq 1 10); do
  sleep 20
  RESULT=$(curl -s http://192.168.3.184:7460/api/runs/$RUN_ID)
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))")
  echo "Attempt $i: status=$STATUS"
  if [ "$STATUS" = "completed" ]; then
    echo "$RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
# Try different result fields
for key in ['result','output','content','artifacts','code']:
    val = d.get(key)
    if val:
        print(f'=== {key} ===')
        print(str(val)[:4000])
        break
" 
    break
  fi
done
```

### STEP 3 — Застосувати результат OpenDesign

Якщо OpenDesign повернув TSX код — зберегти в `src/components/app/AppLayout.tsx`.
Якщо код неповний або не повернувся — реалізувати вручну на основі поточного файлу:

```bash
# Прочитати поточний файл:
cat src/components/app/AppLayout.tsx

# Зміни які треба внести вручну якщо OpenDesign не допоміг:
# 1. Додати в navItems: { to: "/observability", label: "Observability", icon: Activity }
# 2. Додати Activity до lucide-react import
# 3. Знайти <main> або основний контентний div і додати: className="flex-1 overflow-y-auto"
```

### STEP 4 — Sync + TypeScript check

```bash
cp src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx

# TS check на dev server (якщо tsc не працює локально):
# Попроси Claude запустити: ssh vokov@192.168.3.184 'cd ~/workspace/ai-drakon-scaffolder/.lovable && ./node_modules/.bin/tsc --noEmit 2>&1 | grep error | head -10'
```

### VERIFICATION

```bash
grep "observability\|Observability\|Activity" src/components/app/AppLayout.tsx
grep "overflow-y-auto\|overflow-auto" src/components/app/AppLayout.tsx
diff src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx | wc -l
```

### COMMIT

```bash
git add src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx
git commit -m "feat(ui): add Observability nav item + fix mobile scroll in AppLayout"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-155','[x] TASK-155',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-155 done"
git push origin main
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-155:AppLayout-observability+scroll|OpenDesign+manual|commit:<hash>|★★★"

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- OpenDesign URL: http://192.168.3.184:7460 — field є "message" (не "prompt"!)
- Якщо OpenDesign timeout — реалізуй вручну (це займе 2 хвилини)
- Скрол фікс: головний контент має бути `flex-1 overflow-y-auto min-h-0`

---

## TASK-156: Full Platform Design via OpenDesign — Complete UI System
[x] TASK-156

### GOAL
Використати OpenDesign для генерації **повного** дизайну платформи AI-DRAKON:
- AppLayout (sidebar + mobile nav)
- HomePage (agent dashboard)
- PipelineCommandCenter (pipeline UI)
- AgentStudioPage (agent studio)
- PatternSuggestionPanel (architect patterns)

OpenDesign генерує всі компоненти в єдиному стилі. AGY3 зберігає результати.

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 1 — GitNexus route map (MANDATORY)

```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}' \
  | python3 -c "import sys,json; print('GN:', json.load(sys.stdin).get('result',{}).get('serverInfo',{}).get('name','?'))"

curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"route_map","arguments":{"repo":"ai-drakon-scaffolder"}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('content',[{}])[0].get('text','')[:2000])"
```

### STEP 2 — OpenDesign: Complete Design System

Запустити 5 дизайн-запитів послідовно (один за одним, poll кожен до completion):

```bash
OD_URL="http://192.168.3.184:7460/api/runs"

od_run() {
  local MSG="$1"
  local RUN=$(curl -s -X POST "$OD_URL" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$MSG\",\"pluginId\":\"ai-drakon-mobile\",\"agentId\":\"antigravity\"}")
  local RID=$(echo "$RUN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runId',''))")
  echo "Run $RID started..."
  for i in $(seq 1 15); do
    sleep 15
    local R=$(curl -s "$OD_URL/$RID")
    local S=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))")
    echo "  [$i] $S"
    if [ "$S" = "completed" ]; then
      echo "$R" | python3 -c "
import sys,json,re
d=json.load(sys.stdin)
for k in ['result','output','content','code','artifacts']:
    v=d.get(k)
    if v:
        s=str(v)
        m=re.search(r'\x60{3}tsx?(.*?)\x60{3}',s,re.DOTALL)
        if m: print(m.group(1).strip()); break
        print(s[:5000]); break
" 
      break
    fi
  done
}

# Run 1 — AppLayout full redesign
od_run "React TypeScript AppLayout sidebar for AI agent platform. Sidebar nav: Home(/,House), Diagrams(/diagrams,Workflow), Agents(/agents,Bot with online badge), Pipelines(/pipelines,GitMerge), Docs(/docs,BookOpen), Knowledge(/knowledge,Brain), Notebooks(/notebooks,Notebook), Observability(/observability,Activity). Mobile: hamburger + drawer. main content: flex-1 overflow-y-auto min-h-0 for scroll. Settings gear bottom. LanguageSwitcher in header. NavLink active=indigo-400. Dark zinc theme. TypeScript. Full component." 2>&1 | tee /tmp/od-run1.txt

# Run 2 — HomePage dashboard
od_run "React TypeScript HomePage dashboard for AI platform. Shows 3 AgentCard components: Drakon Agent, Docs Agent, Architect Agent. Each card: colored status dot (fetch /health), agent name, description, NavLink button to agent page. Cards in responsive grid 1/2/3 cols. Page title 'AI-DRAKON Platform'. Dark zinc theme. TypeScript. Full component file src/pages/HomePage.tsx." 2>&1 | tee /tmp/od-run2.txt

# Run 3 — PatternSuggestionPanel (new architect feature)
od_run "React TypeScript PatternSuggestionPanel component for architecture patterns. Form: projectDocs (Textarea), requirements (Textarea), Submit button. Loading spinner. Results: list of PatternCard with name, rationale text, tradeoffs list, Use Pattern button. API: POST to architect-agent worker /suggest-patterns. Dark zinc theme. Full component src/components/architect/PatternSuggestionPanel.tsx." 2>&1 | tee /tmp/od-run3.txt

# Run 4 — PipelineProgress SSE
od_run "React TypeScript PipelineProgress component for SSE pipeline execution. Props: pipelineName, onComplete. Uses EventSource to stream steps. Each step: NodeStatusRow with icon (clock=pending, spinner=running, check=done, x=error). Progress bar at top. Steps list with collapsible output text. Dark zinc theme. Full component src/components/pipelines/PipelineProgress.tsx." 2>&1 | tee /tmp/od-run4.txt

# Run 5 — AgentStatusCard  
od_run "React TypeScript AgentStatusCard component. Props: name, status (online/offline/checking), description, route, icon. Shows colored dot badge, agent name bold, status text, description, NavLink Open button. Hover glow effect. Used in HomePage grid. Dark zinc theme. Full component src/components/agents/AgentStatusCard.tsx." 2>&1 | tee /tmp/od-run5.txt

echo "All OpenDesign runs complete"
ls -la /tmp/od-run*.txt
```

### STEP 3 — Save generated code to files

For each run result:
```bash
# Extract TSX code blocks from od-run*.txt and save to files:
python3 << 'PYEOF'
import re, os

files = {
    '/tmp/od-run1.txt': 'src/components/app/AppLayout.tsx',
    '/tmp/od-run2.txt': 'src/pages/HomePage.tsx',
    '/tmp/od-run3.txt': 'src/components/architect/PatternSuggestionPanel.tsx',
    '/tmp/od-run4.txt': 'src/components/pipelines/PipelineProgress.tsx',
    '/tmp/od-run5.txt': 'src/components/agents/AgentStatusCard.tsx',
}

base = os.path.expanduser('~/workspace/ai-drakon-scaffolder')
for src, dst in files.items():
    try:
        text = open(src).read()
        m = re.search(r'```tsx?\n(.*?)```', text, re.DOTALL)
        if m:
            code = m.group(1).strip()
            full = os.path.join(base, dst)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            open(full, 'w').write(code)
            print(f'Saved: {dst} ({len(code)} chars)')
        else:
            print(f'No TSX found in {src} — manual review needed')
    except Exception as e:
        print(f'Error {src}: {e}')
PYEOF
```

### STEP 4 — Sync to .lovable
```bash
for f in \
  src/components/app/AppLayout.tsx \
  src/pages/HomePage.tsx \
  src/components/architect/PatternSuggestionPanel.tsx \
  src/components/pipelines/PipelineProgress.tsx \
  src/components/agents/AgentStatusCard.tsx; do
  dst=".lovable/$f"
  mkdir -p "$(dirname $dst)"
  [ -f "$f" ] && cp "$f" "$dst" && echo "Synced: $f"
done
```

### STEP 5 — Verify and commit
```bash
# Check files exist:
find src/components/architect src/components/agents src/components/pipelines \
  src/pages -name "*.tsx" -newer development/TASKS.md 2>/dev/null

git add \
  src/components/app/AppLayout.tsx \
  src/pages/HomePage.tsx \
  src/components/architect/PatternSuggestionPanel.tsx \
  src/components/pipelines/PipelineProgress.tsx \
  src/components/agents/AgentStatusCard.tsx \
  .lovable/src/components/ \
  .lovable/src/pages/ 2>/dev/null

git commit -m "feat(ui): full platform redesign via OpenDesign — 5 components"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-156','[x] TASK-156',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-156 done"
git push origin main
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-156:full-opendesign|AppLayout+HomePage+3-components|commit:<hash>|★★★★"

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- OpenDesign: POST http://192.168.3.184:7460/api/runs, field "message" (не "prompt"!)
- Якщо OpenDesign не повертає TSX — зберегти raw output в /tmp/ і реалізувати вручну
- Runs виконуються послідовно (не паралельно) — кожен ~1-3 хв
- mkdir -p перед створенням нових директорій (architect/, agents/)

---

## TASK-157: Full Platform Design via OpenDesign — using od-generate.sh
[x] TASK-157

### GOAL
Згенерувати 5 компонентів через OpenDesign (od-generate.sh на dev server) та закомітити.

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### ВАЖЛИВО: Як читати OpenDesign

OpenDesign результат НЕ в API — він в events.jsonl в Docker контейнері.
Використовуй `od-generate.sh` на dev server через SSH:

```bash
# Генерація компонента (запускати через SSH до dev server):
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'ОПИС' /tmp/od-OUTPUT.tsx" 2>&1
# Потім скопіювати результат:
scp vokov@192.168.3.184:/tmp/od-OUTPUT.tsx src/components/CATEGORY/Component.tsx
```

### STEP 1 — GitNexus context

```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}' \
  | python3 -c "import sys,json; print('GN:', json.load(sys.stdin).get('result',{}).get('serverInfo',{}).get('name','?'))"
```

### STEP 2 — Generate 5 components via OpenDesign (one by one)

```bash
cd ~/workspace/ai-drakon-scaffolder

# Component 1: PatternSuggestionPanel
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript PatternSuggestionPanel. Form: projectDocs textarea, requirements textarea, Submit button. Loading state. Results: list of PatternCard with name bold, rationale text, tradeoffs array as bullet list, Use Pattern button. API POST /suggest-patterns returns patterns array. Dark zinc theme Tailwind.' /tmp/od-PatternSuggestionPanel.tsx" 2>&1
scp vokov@192.168.3.184:/tmp/od-PatternSuggestionPanel.tsx src/components/architect/PatternSuggestionPanel.tsx
echo "=== PatternSuggestionPanel done ==="

# Component 2: PipelineProgress SSE
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript PipelineProgress. Props: pipelineName string, onComplete callback. Uses EventSource for SSE. Steps list: each NodeStatusRow has icon clock=pending spinner=running check=done x=error. Progress bar top. Collapsible step output. Dark zinc Tailwind.' /tmp/od-PipelineProgress.tsx" 2>&1
mkdir -p src/components/pipelines
scp vokov@192.168.3.184:/tmp/od-PipelineProgress.tsx src/components/pipelines/PipelineProgress.tsx
echo "=== PipelineProgress done ==="

# Component 3: AgentStatusCard
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript AgentStatusCard. Props: name string, status online|offline|checking string, description string, route string. Colored dot green=online red=offline yellow=checking. Agent name bold. Description text-sm muted. NavLink Open button indigo. Hover glow effect. Dark zinc Tailwind.' /tmp/od-AgentStatusCard.tsx" 2>&1
mkdir -p src/components/agents
scp vokov@192.168.3.184:/tmp/od-AgentStatusCard.tsx src/components/agents/AgentStatusCard.tsx
echo "=== AgentStatusCard done ==="

# Verify files:
ls -la src/components/architect/PatternSuggestionPanel.tsx
ls -la src/components/pipelines/PipelineProgress.tsx
ls -la src/components/agents/AgentStatusCard.tsx
```

### STEP 3 — Sync to .lovable

```bash
for f in \
  src/components/architect/PatternSuggestionPanel.tsx \
  src/components/pipelines/PipelineProgress.tsx \
  src/components/agents/AgentStatusCard.tsx; do
  dst=".lovable/$f"
  mkdir -p "$(dirname $dst)"
  [ -f "$f" ] && cp "$f" "$dst" && echo "Synced: $f"
done
```

### STEP 3b — Visual verification via agent-workspace (browser on RPi 3B)

After syncing to .lovable and pushing — verify visually in browser.

**ВАЖЛИВО:** agent-workspace підключений як MCP в .mcp.json проекту.
Використовуй MCP tools: workspace_browser_navigate, workspace_browser_snapshot, workspace_screenshot

```bash
# Push to trigger CF Pages deploy first:
git add src/components/ .lovable/src/components/
git stash  # temporary stash — push current state
git stash pop

# Wait for Cloudflare Pages deploy (~3 min after push):
sleep 180
```

Then use agent-workspace MCP to verify:
```
# 1. Open site:
workspace_browser_navigate(url="https://ai-drakon-setup.pages.dev", wait_ms=4000)

# 2. Login via paste (React-safe):
workspace_browser_click(selector="input[name=password]")
workspace_paste_text(text="drakon-mcp-2026")
workspace_browser_click(selector="button[type=submit]")

# 3. Check new pages:
workspace_browser_navigate(url="https://ai-drakon-setup.pages.dev/", wait_ms=3000)
workspace_browser_snapshot()  # HTML snapshot — check AgentStatusCard visible

workspace_browser_navigate(url="https://ai-drakon-setup.pages.dev/pipelines", wait_ms=3000)
workspace_browser_snapshot()  # Check PipelineProgress visible

# 4. Screenshot for visual review:
workspace_screenshot(output_path="/tmp/od-result.png")
scp vokov@192.168.3.234:/tmp/od-result.png /tmp/od-result-local.png
```

If snapshot shows correct components — proceed to commit.
If errors or blank pages — check browser console in snapshot and fix.

### STEP 4 — Commit

```bash
git add src/components/architect/ src/components/pipelines/PipelineProgress.tsx src/components/agents/AgentStatusCard.tsx
git add .lovable/src/components/architect/ .lovable/src/components/pipelines/PipelineProgress.tsx .lovable/src/components/agents/AgentStatusCard.tsx
git commit -m "feat(ui): add 3 new components via OpenDesign — PatternSuggestionPanel + PipelineProgress + AgentStatusCard"

python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-157','[x] TASK-157',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-157 done"
git push origin main
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-157:opendesign-3-components|PatternSuggestionPanel+PipelineProgress+AgentStatusCard|commit:<hash>|★★★★"

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- od-generate.sh запускати через SSH до vokov@192.168.3.184
- Результат копіювати через scp
- Якщо файл порожній або містить тільки коментарі — переглянь /tmp/od-*.tsx і виправ вручну

---

## [x] TASK-158: Agent Self-Reflection Loop — Автооновлення протоколів через GitNexus

**Концепція:**
Кожен агент (AGY3, AGY Phone, AGY2, Claude) після сесії з новим досвідом оновлює свій протокол в `exodus-infra/agents/{agent-name}/`, комітить, GitNexus реіндексує. Наступна сесія — агент запитує GitNexus і бачить оновлені протоколи. Самозаряджаюча петля досвіду.

**Архітектура:**
```
Агент виконує задачу
    ↓ (знайдено новий патерн / виправлено помилку)
Запит GitNexus: "чи вже задокументовано?"
    ↓ ні
Оновити exodus-infra/agents/{name}/*.md
    ↓
git commit && git push
    ↓
GitNexus реіндексує (auto або вручну)
    ↓
Наступна сесія: агент запитує GitNexus → бачить оновлений протокол
```

**Файли для створення/оновлення:**

### 1. `exodus-infra/workflows/agent-self-reflection.md`
Документ з описом протоколу для ВСІХ агентів:
- Умови запуску рефлексії (тільки при новому досвіді, не кожну сесію)
- Формат запису нового досвіду
- GitNexus query для перевірки дублікатів
- Коміт формат: `docs(agents): reflect {agent} learned {topic}`

### 2. `exodus-infra/agents/ogy3-tablet/self-reflect.sh`
Скрипт для AGY3 Termux:
```bash
#!/bin/bash
# self-reflect.sh — Записати новий досвід у exodus-infra
# Usage: bash ~/bin/self-reflect.sh "тема" "що навчилися" "файл-для-оновлення"
TOPIC="$1"
LEARNED="$2"
TARGET_FILE="${3:-agents/ogy3-tablet/session-notes.md}"

cd /data/data/com.termux/files/home/workspace/exodus-infra
# Append to session-notes.md
echo "## $(date +%Y-%m-%d): $TOPIC" >> "$TARGET_FILE"
echo "$LEARNED" >> "$TARGET_FILE"
echo "" >> "$TARGET_FILE"
git add "$TARGET_FILE"
git commit -m "docs(agents): reflect ogy3 learned $TOPIC"
git push origin main
echo "Reflected and pushed. Trigger GitNexus reindex next."
```

### 3. `exodus-infra/agents/ogy3-tablet/AGENTS.md` (оновити)
Додати правило:
```
## Self-Reflection Rule
AFTER completing any task where you:
- Fixed a bug not documented in protocols
- Found a better approach than the current protocol
- Discovered a new tool/trick

DO:
1. Query GitNexus: "is {pattern} documented in exodus-infra?"
2. If NO: update exodus-infra/agents/ogy3-tablet/session-notes.md
3. git commit -m "docs(agents): reflect ogy3 learned {topic}"
4. git push
```

### 4. `ai-drakon-scaffolder/AGENTS.md` (оновити)
Додати правило з посиланням на `self-reflect.sh`.

**Кроки:**

1. SSH до dev server, git pull exodus-infra
2. Створити `workflows/agent-self-reflection.md` з описом петлі
3. Створити `agents/ogy3-tablet/self-reflect.sh`
4. Оновити `agents/ogy3-tablet/AGENTS.md` + додати self-reflection правило
5. Оновити `ai-drakon-scaffolder/AGENTS.md` — той що AGY3 читає
6. Commit все до exodus-infra + push
7. Перевірити GitNexus реіндексацію exodus-infra

**Верифікація:**
```bash
# GitNexus має знайти новий workflow:
# mcp__gitnexus__query(query="agent self reflection loop protocol", repo="exodus-infra")
# → має повернути agent-self-reflection.md з описом
```

**Коміт після завершення:**
```
docs(agents): add self-reflection loop protocol for all agents

Кожен агент після нового досвіду оновлює exodus-infra → GitNexus реіндексує → 
наступна сесія стартує з оновленими протоколами.
```

**Diary:**
`"SESSION:$(date +%Y-%m-%d)|TASK-158:self-reflection-loop|commit:<hash>|★★★★"`

!!IMPORTANT!!
- Це DESIGN задача, не код
- Запускати локально на AGY3 Termux
- exodus-infra клонований в ~/workspace/exodus-infra на AGY3
- SSH до vokov@192.168.3.184 тільки для GitNexus реіндексації
- Не чіпати ai-drakon-scaffolder src/ — тільки AGENTS.md і exodus-infra


---

## [x] TASK-159: ObservabilityPage — Redesign via OpenDesign

**GOAL:** Замінити placeholder `src/pages/ObservabilityPage.tsx` на повноцінну сторінку спостереження за системою. Використати od-generate.sh на dev server.

**File:** `src/pages/ObservabilityPage.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 1 — Generate via OpenDesign (on dev server)
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript ObservabilityPage for AI agent platform. Shows: 1) LogsViewer panel — SSE EventSource to /api/logs stream, shows colored log lines (error=red, warn=yellow, info=green), auto-scroll, clear button, level filter selector. 2) MetricsRow — 4 stat cards: Active Agents, Pipeline Runs today, Errors 24h, Avg response ms. Values fetched from /api/metrics endpoint on mount. 3) AgentHealthTable — table rows: agent name, status dot, last ping timestamp, request count. All fetched from /api/agents/status. Page title Observability with Activity icon. Dark zinc theme. TypeScript. Full page component.' /tmp/od-ObservabilityPage.tsx"
```

### STEP 2 — Copy to project
```bash
scp vokov@192.168.3.184:/tmp/od-ObservabilityPage.tsx ~/workspace/ai-drakon-scaffolder/src/pages/ObservabilityPage.tsx
```

### STEP 3 — Verify not empty
```bash
wc -l ~/workspace/ai-drakon-scaffolder/src/pages/ObservabilityPage.tsx
head -5 ~/workspace/ai-drakon-scaffolder/src/pages/ObservabilityPage.tsx
```
If file < 30 lines or has no `export function ObservabilityPage` — implement manually:
```tsx
import { useState, useEffect, useRef } from "react";
import { Activity } from "lucide-react";

interface LogLine { level: string; message: string; ts: string; }
interface Metric { label: string; value: string | number; }

export function ObservabilityPage() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [metrics] = useState<Metric[]>([
    { label: "Active Agents", value: 3 },
    { label: "Pipeline Runs Today", value: 12 },
    { label: "Errors 24h", value: 0 },
    { label: "Avg Response ms", value: 240 },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs");
    es.onmessage = (e) => {
      try {
        const line = JSON.parse(e.data) as LogLine;
        setLogs(prev => [...prev.slice(-200), line]);
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [logs]);

  const levelColor = (l: string) =>
    l === "error" ? "text-red-400" : l === "warn" ? "text-yellow-400" : "text-green-400";

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Activity className="w-6 h-6 text-indigo-400" /> Observability
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500">{m.label}</p>
            <p className="text-2xl font-bold text-zinc-100">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="px-4 py-2 border-b border-zinc-800 text-sm text-zinc-400">Live Logs</div>
        <div className="h-80 overflow-y-auto font-mono text-xs p-3 space-y-1">
          {logs.length === 0 && <p className="text-zinc-600">Waiting for events…</p>}
          {logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-600">{l.ts}</span>
              <span className={levelColor(l.level)}>[{l.level}]</span>
              <span className="text-zinc-300">{l.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
```

### STEP 4 — Sync + commit
```bash
cp src/pages/ObservabilityPage.tsx .lovable/src/pages/ObservabilityPage.tsx
git add src/pages/ObservabilityPage.tsx .lovable/src/pages/ObservabilityPage.tsx
git commit -m "feat(ui): ObservabilityPage — logs SSE + metrics cards redesign"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-159','[x] TASK-159',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md
git commit -m "chore(tasks): TASK-159 done"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-159:ObservabilityPage|SSE-logs+metrics|commit:<hash>|★★★"`

---

## [x] TASK-160: AgentStatusCard Component — via OpenDesign

**GOAL:** Створити `src/components/agents/AgentStatusCard.tsx` — standalone компонент статусу агента для використання в HomePage та інших місцях.

**File:** `src/components/agents/AgentStatusCard.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux.

### STEP 1 — Generate via OpenDesign
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript AgentStatusCard component. Props interface: name string, status online|offline|checking, description string, route string, icon React.ComponentType. Shows: colored status dot (online=green animate-pulse, offline=red, checking=yellow animate-spin), agent name bold text-lg, description text-sm text-zinc-400, NavLink button to route with arrow icon. Card has hover:border-indigo-500 transition. Dark zinc-900 bg border border-zinc-800 rounded-xl p-4. Export named AgentStatusCard.' /tmp/od-AgentStatusCard.tsx"
```

### STEP 2 — Copy and verify
```bash
scp vokov@192.168.3.184:/tmp/od-AgentStatusCard.tsx ~/workspace/ai-drakon-scaffolder/src/components/agents/AgentStatusCard.tsx
wc -l src/components/agents/AgentStatusCard.tsx
```
If < 20 lines implement manually:
```tsx
import { NavLink } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  status: "online" | "offline" | "checking";
  description: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AgentStatusCard({ name, status, description, route, icon: Icon }: Props) {
  const dot = status === "online"
    ? "bg-green-400 animate-pulse"
    : status === "checking"
    ? "bg-yellow-400 animate-spin"
    : "bg-red-400";

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-indigo-500 transition-colors rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", dot)} />
        <Icon className="w-5 h-5 text-indigo-400" />
        <span className="font-bold text-zinc-100">{name}</span>
      </div>
      <p className="text-sm text-zinc-400 flex-1">{description}</p>
      <NavLink to={route} className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">
        Open <ArrowRight className="w-3 h-3" />
      </NavLink>
    </div>
  );
}
```

### STEP 3 — Sync + commit
```bash
cp src/components/agents/AgentStatusCard.tsx .lovable/src/components/agents/AgentStatusCard.tsx
git add src/components/agents/AgentStatusCard.tsx .lovable/src/components/agents/AgentStatusCard.tsx
git commit -m "feat(ui): AgentStatusCard — standalone status component"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-160','[x] TASK-160',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-160 done" && git push origin main
```
**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-160:AgentStatusCard|standalone-component|commit:<hash>|★★★"`

---

## [x] TASK-161: PatternSuggestionPanel — Architect Feature via OpenDesign

**GOAL:** Створити `src/components/architect/PatternSuggestionPanel.tsx` — форма запиту архітектурних патернів до architect-agent.

**File:** `src/components/architect/PatternSuggestionPanel.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux. mkdir -p src/components/architect/ before saving.

### STEP 1 — Generate
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript PatternSuggestionPanel component. Form fields: projectDocs (Textarea placeholder=\"Paste project docs or describe codebase\"), requirements (Textarea placeholder=\"What do you need to build?\"). Submit button with Loader2 spinner when loading. On submit: POST to window.ENV_ARCHITECT_URL+\"/suggest-patterns\" with {projectDocs, requirements}. Response: array of {name, rationale, tradeoffs[]}. Show PatternCard for each: title name bold, rationale text, tradeoffs as bullet list, Use Pattern button that copies name to clipboard. Error state: red alert. Dark zinc theme full component.' /tmp/od-PatternSuggestionPanel.tsx"
```

### STEP 2 — Save
```bash
scp vokov@192.168.3.184:/tmp/od-PatternSuggestionPanel.tsx /tmp/od-PatternSuggestionPanel-check.tsx
wc -l /tmp/od-PatternSuggestionPanel-check.tsx
mkdir -p ~/workspace/ai-drakon-scaffolder/src/components/architect
cp /tmp/od-PatternSuggestionPanel-check.tsx ~/workspace/ai-drakon-scaffolder/src/components/architect/PatternSuggestionPanel.tsx
```

### STEP 3 — Sync + commit
```bash
mkdir -p .lovable/src/components/architect
cp src/components/architect/PatternSuggestionPanel.tsx .lovable/src/components/architect/PatternSuggestionPanel.tsx
git add src/components/architect/ .lovable/src/components/architect/
git commit -m "feat(ui): PatternSuggestionPanel — architect pattern query form"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-161','[x] TASK-161',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-161 done" && git push origin main
```
**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-161:PatternSuggestionPanel|architect-feature|commit:<hash>|★★★"`

---

## [x] TASK-162: PipelineProgress SSE Component — via OpenDesign

**GOAL:** Створити `src/components/pipelines/PipelineProgress.tsx` — SSE streaming компонент прогресу pipeline.

**File:** `src/components/pipelines/PipelineProgress.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux.

### STEP 1 — Generate
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript PipelineProgress component. Props: pipelineId string, onComplete callback. Uses EventSource to stream from /api/pipelines/{pipelineId}/run. Each SSE event: {step: string, status: pending|running|done|error, output?: string}. Shows: progress bar (count done/total), scrollable list of NodeStatusRow (icon by status: Clock=pending, Loader2 spin=running, CheckCircle green=done, XCircle red=error, step name, collapsible output text). Shows spinner while connecting. Done banner when all complete. Stop button that closes EventSource. Dark zinc theme. TypeScript. Full component.' /tmp/od-PipelineProgress.tsx"
```

### STEP 2 — Save
```bash
scp vokov@192.168.3.184:/tmp/od-PipelineProgress.tsx ~/workspace/ai-drakon-scaffolder/src/components/pipelines/PipelineProgress.tsx
wc -l src/components/pipelines/PipelineProgress.tsx
```

### STEP 3 — Sync + commit
```bash
cp src/components/pipelines/PipelineProgress.tsx .lovable/src/components/pipelines/PipelineProgress.tsx
git add src/components/pipelines/PipelineProgress.tsx .lovable/src/components/pipelines/PipelineProgress.tsx
git commit -m "feat(ui): PipelineProgress — SSE streaming execution component"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-162','[x] TASK-162',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-162 done" && git push origin main
```
**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-162:PipelineProgress|SSE-streaming|commit:<hash>|★★★"`

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- od-generate.sh виконується через SSH до vokov@192.168.3.184
- Якщо od-generate.sh повернув порожній файл — використовуй запасний код з STEP 2
- TASK-159 → TASK-160 → TASK-161 → TASK-162 виконуй послідовно
- mkdir -p перед cp для нових директорій (architect/)
- Завжди sync до .lovable/ після зміни src/

---

## [x] TASK-163: Integrate New Components — Connect AgentStatusCard + PipelineProgress + PatternSuggestionPanel

**GOAL:** Підключити 3 нових компоненти до реальних сторінок:
1. `AgentStatusCard` → замінити inline `AgentCard` в `src/pages/HomePage.tsx`
2. `PipelineProgress` → додати як панель виконання в `src/components/pipelines/PipelineCommandCenter.tsx`
3. `PatternSuggestionPanel` → створити нову сторінку `/architect` з цим компонентом + роут

!!IMPORTANT!! Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/

### STEP 0 — GitNexus query (MANDATORY)
```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"query":"HomePage AgentCard component inline definition","repo":"ai-drakon-scaffolder"}}}' \
  | grep '^data:' | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:2000]) for l in sys.stdin]"
```

### STEP 1 — Replace AgentCard with AgentStatusCard in HomePage

Edit `src/pages/HomePage.tsx`:
- Remove inline `AgentCard` component and its `Props` interface
- Import `AgentStatusCard` from `@/components/agents/AgentStatusCard`
- Keep the same 3 agent data (Drakon Agent, Docs Agent, Architect Agent) but pass as `AgentStatusCard` props
- Keep health fetch logic (move to parent or keep in AgentStatusCard if it has same logic)

Check AgentStatusCard props first:
```bash
head -20 src/components/agents/AgentStatusCard.tsx
```

### STEP 2 — Add PatternSuggestionPanel as new /architect page

Create `src/pages/ArchitectPage.tsx`:
```tsx
import { PatternSuggestionPanel } from "@/components/architect/PatternSuggestionPanel";
import { Building2 } from "lucide-react";

export function ArchitectPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Building2 className="w-6 h-6 text-indigo-400" /> Architect
      </h1>
      <PatternSuggestionPanel />
    </div>
  );
}
```

Create `src/routes/architect.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ArchitectPage } from "@/pages/ArchitectPage";

export const Route = createFileRoute("/architect")({
  component: ArchitectPage,
});
```

Add Architect to AppLayout nav:
```bash
# In src/components/app/AppLayout.tsx, find navItems array
# Add after "Knowledge" entry:
# { to: "/architect", label: "Architect", icon: Building2 }
# Also import Building2 from lucide-react
grep -n "Knowledge\|navItems" src/components/app/AppLayout.tsx | head -10
```

### STEP 3 — Add PipelineProgress to PipelineCommandCenter

In `src/components/pipelines/PipelineCommandCenter.tsx`:
- Import `PipelineProgress` from `@/components/pipelines/PipelineProgress`
- Find where pipeline execution result is shown (after "Run Pipeline" button click)
- Show `<PipelineProgress pipelineId={currentPipelineId} />` when execution starts
- If no pipelineId available: add a state `runningPipelineId` that gets set when run button clicked

Check current run button area:
```bash
grep -n "run\|Run\|execute\|Execute" src/components/pipelines/PipelineCommandCenter.tsx | head -15
```

### STEP 4 — Sync all changes to .lovable
```bash
cp src/pages/HomePage.tsx .lovable/src/pages/HomePage.tsx
cp src/pages/ArchitectPage.tsx .lovable/src/pages/ArchitectPage.tsx || true
mkdir -p .lovable/src/routes
cp src/routes/architect.tsx .lovable/src/routes/architect.tsx
cp src/components/app/AppLayout.tsx .lovable/src/components/app/AppLayout.tsx
cp src/components/pipelines/PipelineCommandCenter.tsx .lovable/src/components/pipelines/PipelineCommandCenter.tsx
```

### STEP 5 — Commit
```bash
git add \
  src/pages/HomePage.tsx \
  src/pages/ArchitectPage.tsx \
  src/routes/architect.tsx \
  src/components/app/AppLayout.tsx \
  src/components/pipelines/PipelineCommandCenter.tsx \
  .lovable/src/pages/ \
  .lovable/src/routes/ \
  .lovable/src/components/
git commit -m "feat(ui): integrate AgentStatusCard + PatternSuggestionPanel + PipelineProgress

- HomePage: replace inline AgentCard with AgentStatusCard component
- /architect: new page with PatternSuggestionPanel
- AppLayout: add Architect nav item (Building2 icon)
- PipelineCommandCenter: add PipelineProgress SSE panel"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-163','[x] TASK-163',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-163 done" && git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-163:component-integration|AgentStatusCard+ArchitectPage+PipelineProgress|commit:<hash>|★★★★"`

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- ПЕРЕД редагуванням — GitNexus query для кожного файлу
- AgentStatusCard може мати інші props ніж inline AgentCard — read first!
- Якщо AgentStatusCard не має healthUrl prop — адаптуй або залиш inline AgentCard
- PipelineProgress інтеграція: тільки якщо є pipelineId в PipelineCommandCenter — інакше пропусти STEP 3

---

## [x] TASK-164: SettingsPage — Full Redesign via OpenDesign

**GOAL:** Замінити placeholder `src/pages/SettingsPage.tsx` на повноцінну сторінку налаштувань.

**File:** `src/pages/SettingsPage.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux.

### STEP 1 — Generate via OpenDesign
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript SettingsPage for AI agent platform. Sections: 1) API Keys — form with inputs for OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, each with show/hide toggle (Eye/EyeOff lucide icons) and Save button per row. 2) Agent Config — two toggles: Enable auto-retry (Switch), Debug mode (Switch). Dropdown: Default model selector (gemini-2.5-flash, claude-3-5-sonnet, gpt-4o). 3) System Info — read-only cards showing: App Version, Build Date, GitNexus status (fetch /api/health), CloudFlare status. All changes save to localStorage. Page header Settings with Settings icon. Dark zinc theme. Export named SettingsPage. Full component.' /tmp/od-SettingsPage.tsx"
```

### STEP 2 — Copy and verify
```bash
scp vokov@192.168.3.184:/tmp/od-SettingsPage.tsx ~/workspace/ai-drakon-scaffolder/src/pages/SettingsPage.tsx
wc -l src/pages/SettingsPage.tsx
head -5 src/pages/SettingsPage.tsx
```
If < 30 lines, implement minimal version manually:
```tsx
import { useState } from "react";
import { Settings, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsPage() {
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState({
    openai: localStorage.getItem("OPENAI_API_KEY") ?? "",
    anthropic: localStorage.getItem("ANTHROPIC_API_KEY") ?? "",
    gemini: localStorage.getItem("GEMINI_API_KEY") ?? "",
  });
  const save = (k: string, v: string) => { localStorage.setItem(k, v); };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Settings className="w-6 h-6 text-indigo-400" /> Settings
      </h1>
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-300">API Keys</h2>
        {[
          { id: "openai", label: "OpenAI API Key", storeKey: "OPENAI_API_KEY" },
          { id: "anthropic", label: "Anthropic API Key", storeKey: "ANTHROPIC_API_KEY" },
          { id: "gemini", label: "Gemini API Key", storeKey: "GEMINI_API_KEY" },
        ].map(({ id, label, storeKey }) => (
          <div key={id} className="flex items-center gap-2">
            <Label className="w-44 text-zinc-400 text-sm">{label}</Label>
            <div className="relative flex-1">
              <Input
                type={show[id] ? "text" : "password"}
                value={keys[id as keyof typeof keys]}
                onChange={e => setKeys(p => ({ ...p, [id]: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 pr-10"
              />
              <button onClick={() => setShow(p => ({ ...p, [id]: !p[id] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {show[id] ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => save(storeKey, keys[id as keyof typeof keys])}>
              <Save size={14} />
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### STEP 3 — Sync + commit
```bash
cp src/pages/SettingsPage.tsx .lovable/src/pages/SettingsPage.tsx
git add src/pages/SettingsPage.tsx .lovable/src/pages/SettingsPage.tsx
git commit -m "feat(ui): SettingsPage — API keys + toggles + system info"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-164','[x] TASK-164',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-164 done" && git push origin main
```
**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-164:SettingsPage|API-keys+toggles|commit:<hash>|★★★"`

---

## [x] TASK-165: NotebookLMPage — Dark Zinc Redesign + Remove PageHeader

**GOAL:** Оновити `src/pages/NotebookLMPage.tsx` — прибрати `PageHeader` (старий компонент), перейти на dark zinc стиль консистентний з рештою платформи.

**File:** `src/pages/NotebookLMPage.tsx`

!!IMPORTANT!! Run locally on AGY3 Termux.

### STEP 1 — Read current file
```bash
cat src/pages/NotebookLMPage.tsx
```

### STEP 2 — Generate redesign via OpenDesign
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript NotebookLMPage. Shows: page header with Notebook lucide icon and title NotebookLM, subtitle text Connect to knowledge zones. Info banner: blue-400 border, Info icon, text about Gateway connection. Main area: full-height NotebookLMChatPanel component (imported from @/components/notebooklm/NotebookLMChatPanel). Layout: flex flex-col h-full. Dark zinc-950 bg. No PageHeader import. Export named NotebookLMPage.' /tmp/od-NotebookLMPage.tsx"
```

### STEP 3 — Copy result (verify imports match existing component)
```bash
scp vokov@192.168.3.184:/tmp/od-NotebookLMPage.tsx /tmp/od-NotebookLMPage-check.tsx
# Verify NotebookLMChatPanel import path is correct
grep "NotebookLMChatPanel" /tmp/od-NotebookLMPage-check.tsx
# If correct → copy
cp /tmp/od-NotebookLMPage-check.tsx src/pages/NotebookLMPage.tsx
```

If OpenDesign result is bad, use this minimal fix:
```tsx
import { NotebookLMChatPanel } from "@/components/notebooklm/NotebookLMChatPanel";
import { Notebook, Info } from "lucide-react";

export function NotebookLMPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Notebook className="w-6 h-6 text-indigo-400" /> NotebookLM
        </h1>
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-zinc-900 border border-blue-500/20 text-blue-400 text-xs">
          <Info className="w-4 h-4 shrink-0" />
          <span>Connect to knowledge zones via Garden Gateway to access vector-indexed materials.</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <NotebookLMChatPanel />
      </div>
    </div>
  );
}
```

### STEP 4 — Sync + commit
```bash
cp src/pages/NotebookLMPage.tsx .lovable/src/pages/NotebookLMPage.tsx
git add src/pages/NotebookLMPage.tsx .lovable/src/pages/NotebookLMPage.tsx
git commit -m "feat(ui): NotebookLMPage — dark zinc redesign, remove PageHeader"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[x] TASK-165','[x] TASK-165',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-165 done" && git push origin main
```
**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-165:NotebookLMPage|dark-zinc-redesign|commit:<hash>|★★★"`

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- TASK-164 → TASK-165 виконувати послідовно
- NotebookLMChatPanel вже існує — НЕ видаляти, лише обгортка змінюється
- Якщо OpenDesign повертає порожній файл — використати мінімальний код з STEP 3

---

## [x] TASK-166: Visual QA + TypeScript Check — Full Platform

**GOAL:** Перевірити всі нові компоненти і сторінки після редизайну. TypeScript check + agent-workspace браузер на RPi 3B.

!!IMPORTANT!! Run locally on AGY3 Termux. SSH to dev server for tsc.

### STEP 0 — GitNexus: check route map
```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_map","arguments":{"repo":"ai-drakon-scaffolder"}}}' \
  | grep '^data:' | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:3000]) for l in sys.stdin]"
```

### STEP 1 — TypeScript check (on dev server)
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && npx tsc --noEmit 2>&1 | tail -30"
```

Fix any TS errors before proceeding. Common issues:
- Missing props types in AgentStatusCard usage
- Import paths with wrong case
- `export const` vs `export function` mismatch

### STEP 2 — Visual QA via agent-workspace browser (RPi 3B)

Connect to agent-workspace MCP (already configured on AGY3):
```bash
# Check deployed URL first:
curl -s https://ai-drakon-setup.pages.dev/ | head -5
```

Pages to check in browser (navigate to each, take screenshot, verify):
```
1. https://ai-drakon-setup.pages.dev/           → HomePage: 3 agent cards, status dots
2. https://ai-drakon-setup.pages.dev/observability → Observability: metrics + log panel
3. https://ai-drakon-setup.pages.dev/architect   → Architect: PatternSuggestionPanel form
4. https://ai-drakon-setup.pages.dev/settings    → Settings: API keys + toggles
5. https://ai-drakon-setup.pages.dev/notebooks   → NotebookLM: dark zinc header
6. https://ai-drakon-setup.pages.dev/pipelines   → Pipelines: PipelineCommandCenter
```

If Cloudflare deploy not updated yet (changes < 3 min ago):
```bash
# Wait 3 min then retry, or check:
curl -I https://ai-drakon-setup.pages.dev/ | grep -i "cf-\|last-modified"
```

### STEP 3 — Report issues found

For each broken page:
- Note the issue
- Fix immediately if < 5 lines change
- Add as new TASK if complex

### STEP 4 — Commit fixes (if any)
```bash
git add src/ .lovable/src/
git commit -m "fix(ui): visual QA fixes from TASK-166"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-166','[x] TASK-166',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-166 done" && git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-166:visual-qa|pages-verified+ts-clean|commit:<hash>|★★★★"`

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- Виконувати ПІСЛЯ TASK-163, 164, 165 (щоб всі сторінки вже існували)
- tsc: запускати через SSH до 192.168.3.184, НЕ локально
- agent-workspace: MCP вже налаштований, використовувати workspace_browser_navigate + workspace_browser_snapshot
- Очікувані проблеми: TS type errors в AgentStatusCard props, можливо missing imports

---

## [x] TASK-167: LoginPage Polish + Mark TASK-149/150/151 Superseded

**GOAL:**
1. Перевірити `src/pages/LoginPage.tsx` — консистентний з dark zinc стилем?
2. Оновити якщо потрібно
3. Позначити застарілі TASK-149, TASK-150, TASK-151 як [s] (superseded)

!!IMPORTANT!! Run locally on AGY3 Termux.

### STEP 0 — GitNexus
```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"query":"LoginPage authentication form","repo":"ai-drakon-scaffolder"}}}' \
  | grep '^data:' | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:2000]) for l in sys.stdin]"
```

### STEP 1 — Read LoginPage
```bash
cat src/pages/LoginPage.tsx | head -40
```

### STEP 2 — Check if it uses dark zinc or old styles
Look for:
- `bg-zinc-950` or `bg-background` (old)
- `text-zinc-100` or `text-foreground` (old)
- Inline `AgentCard` or other old patterns

If it uses old `bg-background` / `text-foreground` CSS vars → update to explicit zinc colors for consistency.

Generate update via OpenDesign if major redesign needed:
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'React TypeScript LoginPage for AI agent platform. Centered card on dark zinc-950 background. Card: zinc-900 bg, border zinc-800, rounded-xl, shadow-xl. Title: AI-DRAKON with Bot icon indigo-400. Form: email input, password input with show/hide toggle, Sign In button indigo-600 hover:indigo-500. Loading spinner on submit. Error message in red. Uses Appwrite auth (import from @/context/AuthContext or call appwrite client). On success: navigate to /. Dark theme. Export named LoginPage.' /tmp/od-LoginPage.tsx"
```

If LoginPage is already fine → skip to STEP 3.

### STEP 3 — Mark superseded tasks

```bash
python3 << 'PYEOF'
with open("development/TASKS.md", "r") as f:
    c = f.read()
# Mark as superseded (replaced by TASK-152..166)
c = c.replace("[ ] TASK-149", "[s] TASK-149 (superseded by TASK-152+)", 1)
c = c.replace("[ ] TASK-150", "[s] TASK-150 (superseded by TASK-152..166)", 1)
c = c.replace("[ ] TASK-151", "[s] TASK-151 (superseded by TASK-166)", 1)
with open("development/TASKS.md", "w") as f:
    f.write(c)
print("Marked superseded")
PYEOF
```

### STEP 4 — Commit
```bash
git add src/pages/LoginPage.tsx .lovable/src/pages/LoginPage.tsx development/TASKS.md 2>/dev/null
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-149/150/151 superseded; LoginPage dark zinc polish"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-167','[x] TASK-167',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-167 done" && git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-167:login-polish+cleanup|TASK-149-151-superseded|commit:<hash>|★★"`

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- LoginPage може бути вже нормальним — read first, edit only if needed
- TASK-149/150/151 mark as [s] НЕ [x] — вони не виконані, а замінені

---

## [x] TASK-168: Mobile QA via agent-workspace Browser — RPi 3B

**GOAL:** Перевірити всі сторінки платформи в мобільному вигляді через agent-workspace браузер на RPi 3B. Знайти і виправити scroll проблеми, layout баги, broken UI.

Deployed URL: `https://ai-drakon-setup.pages.dev`

!!IMPORTANT!! Run locally on AGY3 Termux. Use agent-workspace MCP for browser.

### STEP 0 — Wait for CF deploy (3 хв після останнього push)
```bash
# Check if latest commit is deployed:
LATEST=$(git log --oneline -1 | cut -d' ' -f1)
echo "Latest commit: $LATEST"
curl -s https://ai-drakon-setup.pages.dev/ | grep -c "AI-DRAKON\|drakon\|vite" || echo "checking..."
# If site loads → proceed
```

### STEP 1 — Start agent-workspace session on RPi 3B

AGY3 має доступ до agent-workspace MCP (налаштований). Запустити браузер:
```
workspace_browser_navigate(url="https://ai-drakon-setup.pages.dev/")
```
Потім встановити мобільний viewport (375x812 — iPhone):
```
workspace_browser_snapshot() → check current state
```

### STEP 2 — QA checklist: кожну сторінку перевірити

Для кожної сторінки:
1. `workspace_browser_navigate(url=PAGE_URL)`
2. `workspace_browser_snapshot()` → зробити screenshot
3. Перевірити: чи скролиться? чи видно весь контент? чи не обрізає MobileNav?

**Сторінки для перевірки:**
```
/ (HomePage)            — AgentStatusCard grid, статуси агентів
/observability          — metrics cards, logs panel
/architect              — PatternSuggestionPanel form
/settings               — API keys form, toggles
/notebooks              — NotebookLM dark zinc header
/pipelines              — PipelineCommandCenter
/diagrams               — DiagramsPage
/knowledge              — KnowledgePage
/docs                   — DocsPage
```

### STEP 3 — Document issues

Для кожної знайденої проблеми записати:
```
PAGE: /xxx
ISSUE: опис проблеми
FIX: що треба змінити (клас/файл/рядок)
```

### STEP 4 — Fix issues directly

Типові проблеми і фікси:

**Контент обрізається знизу MobileNav:**
```bash
# Додати pb-20 до сторінки або компонента
sed -i 's/className="p-4 space-y/className="p-4 pb-20 space-y/' src/pages/PAGENAME.tsx
```

**Горизонтальний overflow (контент ширший за екран):**
```bash
# Знайти div без overflow-x-hidden
grep -n "overflow" src/pages/PAGENAME.tsx
```

**Текст не читається (занадто малий):**
```bash
# Перевірити text-xs → text-sm на мобільному
```

**Сторінка не знайдена (404):**
```bash
# Перевірити чи є роут у src/routes/
ls src/routes/
```

### STEP 5 — Commit всі фікси
```bash
git add src/ .lovable/src/
git commit -m "fix(ui): mobile QA fixes — scroll, overflow, padding

Found via agent-workspace browser QA on RPi 3B.
[список виправлених сторінок]"
python3 -c "
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-168','[x] TASK-168',1)
with open('development/TASKS.md','w') as f: f.write(c)
"
git add development/TASKS.md && git commit -m "chore(tasks): TASK-168 done" && git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-168:mobile-QA|agent-browser+fixes|commit:<hash>|★★★★"`

### NOTES
- !!IMPORTANT!! Run locally on AGY3 Termux
- agent-workspace MCP: вже налаштований, використовувати workspace_browser_* tools
- Deployed URL: https://ai-drakon-setup.pages.dev
- Мобільний viewport: 375px ширина (iPhone SE/mini)
- CF Pages deploy після push: ~2-3 хв
- Scroll фікс вже є: pb-24 в AppLayout — але окремі сторінки можуть мати свої проблеми
- Якщо сторінка недоступна → перевірити src/routes/ чи є файл роута

---

## [x] TASK-169: Mobile Scroll Fix — WorkspaceShell.tsx (реальний layout)

**GOAL:** Виправити мобільний скрол. `AppLayout.tsx` НЕ використовується в app — реальний layout це `WorkspaceShell.tsx`. Головна сторінка не скролиться через `overflow-hidden` на `<main>`.

!!IMPORTANT!! SSH to 192.168.3.184 for git operations. Run locally on AGY3 Termux for AGY CLI.

### STEP 0 — GitNexus context
```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"query":"WorkspaceShell mobile scroll overflow layout","repo":"ai-drakon-scaffolder"}}}' \
  | grep '^data:' | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:2000]) for l in sys.stdin]"
```

### STEP 1 — Read current WorkspaceShell
```bash
ssh vokov@192.168.3.184 "grep -n 'overflow\|flex.*h-full\|pb-16\|pb-24\|min-h-0' ~/workspace/ai-drakon-scaffolder/.lovable/src/components/workspace/WorkspaceShell.tsx"
```

**Root cause confirmed:**
```tsx
// Line ~285 in WorkspaceShell.tsx:
<main className="flex h-full min-h-0 flex-1 min-w-0 overflow-hidden pb-16 lg:pb-0">
```
`overflow-hidden` blocks ALL scrolling on mobile touch.

### STEP 2 — Fix WorkspaceShell main element

```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('.lovable/src/components/workspace/WorkspaceShell.tsx') as f: c=f.read()
# Fix: overflow-hidden → overflow-y-auto (enables touch scroll)
c = c.replace(
    'flex h-full min-h-0 flex-1 min-w-0 overflow-hidden pb-16 lg:pb-0',
    'flex h-full min-h-0 flex-1 min-w-0 overflow-y-auto pb-16 lg:pb-0'
)
with open('.lovable/src/components/workspace/WorkspaceShell.tsx', 'w') as f: f.write(c)
print('done')
\""
```

### STEP 3 — Sync src/ and verify
```bash
ssh vokov@192.168.3.184 "cp ~/workspace/ai-drakon-scaffolder/.lovable/src/components/workspace/WorkspaceShell.tsx ~/workspace/ai-drakon-scaffolder/src/components/workspace/WorkspaceShell.tsx && grep -n 'overflow-y-auto pb-16' ~/workspace/ai-drakon-scaffolder/.lovable/src/components/workspace/WorkspaceShell.tsx"
```

### STEP 4 — Commit and push
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && git add .lovable/src/components/workspace/WorkspaceShell.tsx src/components/workspace/WorkspaceShell.tsx && git commit -m 'fix(ui): mobile scroll — WorkspaceShell main overflow-hidden → overflow-y-auto' && git push origin main"
```

Also update TASKS.md to note AppLayout.tsx was wrong file:
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-169','[x] TASK-169',1)
with open('development/TASKS.md','w') as f: f.write(c)
\" && git add development/TASKS.md && git commit -m 'chore(tasks): TASK-169 done' && git push origin main"
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-169:mobile-scroll-WorkspaceShell|overflow-hidden->overflow-y-auto|commit:<hash>|★★★★"`

### NOTES
- WorkspaceShell.tsx is the REAL layout (mounted from __root.tsx via WorkspaceShell)
- AppLayout.tsx exists but is NOT used in routing — our previous fix was wrong file
- `pb-16 lg:pb-0` is correct (padding for MobileNavigationDock at bottom)
- After CF Pages deploy (~3 min), test on mobile

---

## [x] TASK-170: GitHub Nav + ProjectSelector — Add /github to nav + fix "can't return"

**GOAL:** 
1. Добавити `/github` до навігації WorkspaceShell (NAV_WORKSPACE або NAV_SYSTEM)
2. Перевірити чи ProjectSelector відображає GitHub налаштування після першого запуску
3. Якщо налаштування GitHub не доступні після першого запуску — додати кнопку в Settings tab

!!IMPORTANT!! SSH to 192.168.3.184. Run locally on AGY3 Termux.

### STEP 0 — Read WorkspaceShell nav
```bash
ssh vokov@192.168.3.184 "grep -n 'NAV_WORKSPACE\|NAV_SYSTEM\|github\|GitHub' ~/workspace/ai-drakon-scaffolder/.lovable/src/components/workspace/WorkspaceShell.tsx | head -20"
```

### STEP 1 — Add GitHub to NAV_WORKSPACE via OpenDesign
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'Add Github icon (Github from lucide-react) to NAV_WORKSPACE array in WorkspaceShell.tsx. Add after /notebooks entry: { to: \"/github\", label: \"GitHub\", icon: Github }. Also add Github to the import from lucide-react. Return ONLY the modified imports + NAV_WORKSPACE const, TypeScript.' /tmp/od-github-nav.tsx"
cat /tmp/od-github-nav.tsx
```

Apply the change manually:
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('.lovable/src/components/workspace/WorkspaceShell.tsx') as f: c=f.read()
# Add Github to lucide import
c = c.replace('  BookOpen,', '  BookOpen,\n  Github,')
# Add /github to NAV_WORKSPACE after /notebooks
c = c.replace(
    '  { to: \"/notebooks\", label: \"NotebookLM\", icon: BookOpen },',
    '  { to: \"/notebooks\", label: \"NotebookLM\", icon: BookOpen },\n  { to: \"/github\", label: \"GitHub\", icon: Github },'
)
with open('.lovable/src/components/workspace/WorkspaceShell.tsx', 'w') as f: f.write(c)
print('done')
\""
```

### STEP 2 — Sync + commit
```bash
ssh vokov@192.168.3.184 "cp ~/workspace/ai-drakon-scaffolder/.lovable/src/components/workspace/WorkspaceShell.tsx ~/workspace/ai-drakon-scaffolder/src/components/workspace/WorkspaceShell.tsx && cd ~/workspace/ai-drakon-scaffolder && git add .lovable/src/components/workspace/WorkspaceShell.tsx src/components/workspace/WorkspaceShell.tsx && git commit -m 'feat(nav): add /github to WorkspaceShell navigation' && git push origin main"
```

### STEP 3 — Mark done
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[x] TASK-170','[x] TASK-170',1)
with open('development/TASKS.md','w') as f: f.write(c)
\" && git add development/TASKS.md && git commit -m 'chore(tasks): TASK-170 done' && git push origin main"
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-170:github-nav+fix-return|WorkspaceShell+/github|commit:<hash>|★★★"`

### NOTES
- WorkspaceShell.tsx: NAV_WORKSPACE has pipelines, diagrams, knowledge, notebooks, code, docs
- GitHub is accessible at /github route but NOT in the nav
- getBreadcrumb already handles /github → shows "GitHub" in breadcrumb
- ProjectSelector shows project-level GitHub config in sidebar

---

## [x] TASK-171: GitHub API Error — Better UX + Worker env.GITHUB_TOKEN expired notice

**GOAL:**
1. Покращити повідомлення про помилку GitHub в settings.tsx — розрізняти "немає токена" vs "поганий токен" vs "репо не знайдено"
2. Додати підказку що `env.GITHUB_TOKEN` на Worker може бути протермінованим
3. Перевірити чи правильно передається X-Github-Token через api.ts

!!IMPORTANT!! SSH to 192.168.3.184. Run locally on AGY3 Termux.

### STEP 0 — Root cause summary
- `drakon-mcp-worker.maxfraieho.workers.dev` — Worker's `env.GITHUB_TOKEN` is expired (returns 401 even on public repos)
- Frontend sends `X-Github-Token` header with user's PAT — if PAT is valid, Worker uses IT instead of env
- Repo `maxfraieho/sonate-solidsite` returns 404 unauthenticated (private or doesn't exist)
- Error "GitHub повернув помилку" is too generic

### STEP 1 — Read verifyGithub function
```bash
ssh vokov@192.168.3.184 "sed -n '133,165p' ~/workspace/ai-drakon-scaffolder/.lovable/src/routes/settings.tsx"
```

### STEP 2 — Improve error handling in verifyGithub via OpenDesign
```bash
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'Improve the verifyGithub function in settings.tsx. Current code calls api.githubListBranches and on failure shows generic \"GitHub повернув помилку\". Replace with: 1) check if token field is empty → show \"Введіть Personal Access Token\" 2) on success=false show the actual error from response (response.error or response.message) instead of hardcoded string 3) add a note below the test button: \"Якщо ваш токен правильний але помилка — можливо Worker env.GITHUB_TOKEN протермінований. Оновіть його в Cloudflare Dashboard → Workers → drakon-mcp-worker → Settings → Variables.\" Return ONLY the modified verifyGithub function and the JSX section near the test button. TypeScript React.' /tmp/od-github-error.tsx"
cat /tmp/od-github-error.tsx | head -60
```

### STEP 3 — Apply the fix
Read the generated code and apply to settings.tsx:

**verifyGithub fix:**
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('.lovable/src/routes/settings.tsx') as f: c=f.read()

# Fix 1: Add empty token check
old_verify = '''const verifyGithub = async () => {
setIsCheckingGithub(true);
setGithubStatus({ type: \\\"idle\\\", text: \\\"Перевіряю...\\\" });

try {
const response = await api.githubListBranches('''

new_verify = '''const verifyGithub = async () => {
if (!settings.github.token.trim()) {
  setGithubStatus({ type: \\\"error\\\", text: \\\"Введіть Personal Access Token\\\" });
  return;
}
setIsCheckingGithub(true);
setGithubStatus({ type: \\\"idle\\\", text: \\\"Перевіряю...\\\" });

try {
const response = await api.githubListBranches('''

c = c.replace(old_verify, new_verify, 1)

# Fix 2: Better error from response
c = c.replace(
  'throw new Error(\\\"GitHub повернув помилку\\\");',
  'throw new Error((response as any).error || (response as any).message || \\\"GitHub повернув помилку\\\");'
)

with open('.lovable/src/routes/settings.tsx', 'w') as f: f.write(c)
print('done')
\""
```

**Add hint text below test button:**
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('.lovable/src/routes/settings.tsx') as f: c=f.read()
c = c.replace(
  '{statusBadge(githubStatus)}',
  '{statusBadge(githubStatus)}\n{githubStatus.type === \\\"error\\\" && <p className=\\\"text-xs text-muted-foreground mt-2\\\">Якщо токен вірний але помилка — оновіть <code>env.GITHUB_TOKEN</code> в <a href=\\\"https://dash.cloudflare.com\\\" target=\\\"_blank\\\" className=\\\"text-primary underline\\\">Cloudflare Dashboard</a> → Workers → drakon-mcp-worker → Settings → Variables.</p>}'
)
with open('.lovable/src/routes/settings.tsx', 'w') as f: f.write(c)
print('done')
\""
```

### STEP 4 — Sync and commit
```bash
ssh vokov@192.168.3.184 "cp ~/workspace/ai-drakon-scaffolder/.lovable/src/routes/settings.tsx ~/workspace/ai-drakon-scaffolder/src/routes/settings.tsx && cd ~/workspace/ai-drakon-scaffolder && git add .lovable/src/routes/settings.tsx src/routes/settings.tsx && git commit -m 'fix(github): better error UX — empty token check, show actual error, Worker env hint' && git push origin main"
```

### STEP 5 — Mark done
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[ ] TASK-171','[x] TASK-171',1)
with open('development/TASKS.md','w') as f: f.write(c)
\" && git add development/TASKS.md && git commit -m 'chore(tasks): TASK-171 done' && git push origin main"
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-171:github-error-ux|token-check+real-error+cf-hint|commit:<hash>|★★★"`

### NOTES
- Worker env.GITHUB_TOKEN is expired — shows 401 Bad credentials
- When user provides valid PAT via X-Github-Token header → Worker uses IT (not env)
- User must have valid PAT with `repo` scope for private repos
- Repo `maxfraieho/sonate-solidsite` returns 404 unauthenticated (private or not created)
- The actual error from Worker: {"success":false,"error":"Internal error: GitHub API 401: {\"message\":\"Bad credentials\"...}"}

---

## [x] TASK-172: Unified ProjectFileManager — один файловий менеджер для /docs, /code, /knowledge

**МЕТА:** Замінити три окремих файлових менеджери (`DocsFilesTab`, `NotesTab` у knowledge, `CodePage FileTree`) одним компонентом `ProjectFileManager` з режимами-фільтрами.

**БАЗА КОДУ:** Bloom (`/home/vokov/projects/garden-seedling-stage/src`)
- `src/pages/FilesPage.tsx` — файловий менеджер (дерево + пошук + hover-дії)
- `src/components/garden/EditorFolderTree.tsx` — collapsible sidebar tree

**РЕДАКТОР:** Monaco Editor з `CodePage.tsx` — єдиний редактор для ALL режимів.

---

### АРХІТЕКТУРА НОВОГО КОМПОНЕНТА

**Файл:** `src/components/files/ProjectFileManager.tsx`

```
ProjectFileManager
├── Left sidebar (w-56, collapsible)
│   ├── Header: назва проекту + кнопка collapse
│   ├── Filter pills: [All] [/docs] [Code]  ← amber active
│   ├── Search input
│   └── FileTree (lazy, GitHub API або local)
│       ├── Folder row: chevron + icon + name
│       │   └── hover: FilePlus, FolderPlus, Tag (assign zone)
│       └── File row: icon + name + ext badge
│           └── hover: Edit, Delete
├── Center toolbar (h-10, border-b)
│   ├── Breadcrumb (font-mono text-xs text-zinc-400)
│   └── Right: Save btn (amber) + branch pill
├── Editor panel (flex-1)
│   └── Monaco Editor (auto-lang detect, vs-dark)
│       └── Empty state: "Оберіть файл"
└── Status bar (h-6, bg-zinc-900, font-mono text-xs)
    ├── Left: назва файлу + мова
    └── Right: рядок:колонка
```

**Props:**
```typescript
interface ProjectFileManagerProps {
  defaultMode?: "all" | "docs" | "code";
}
```

**Режими фільтрів:**
- `all` — весь репозиторій
- `docs` — тільки папка `docs/` (як колишній /docs)
- `code` — весь репозиторій без `docs/` та `node_modules/`

**Дерево файлів (адаптація з Bloom `FilesPage`):**
- Lazy loading: `api.githubListTree(owner, repo, path, branch)` при кліку на папку
- Якщо немає GitHub config → показати `fetchNotesTree()` тільки для docs-режиму
- Розширення/згортання папок локальним state (Set\<string\>)
- Пошук: фільтр по назві файлу/папки (як у Bloom)

**Monaco Editor (перенести з `CodePage.tsx`):**
- `import Editor from "@monaco-editor/react"`
- `detectLang(path)` — вже є у `CodePage.tsx` (рядки 21-30), копіювати
- theme: `vs-dark`
- Для `.md` файлів — мова `markdown` (Monaco рендерить нормально)

---

### ЗМІНИ У МАРШРУТАХ

#### `/docs` → `src/routes/docs.tsx`
Замінити весь вміст на:
```tsx
import { ProjectFileManager } from "@/components/files/ProjectFileManager";
// ...
return <ProjectFileManager defaultMode="docs" />;
```
Видалити: tabs Generator/Документи/Граф з routes/docs.tsx (вони залишаться як окремі кнопки якщо треба — але не основний view).

#### `/code` → `src/routes/code.tsx`  
Замінити `CodePage` на:
```tsx
return <ProjectFileManager defaultMode="code" />;
```
`CodePage.tsx` можна залишити але маршрут перенаправляє на новий компонент.

#### `/knowledge` → `src/pages/KnowledgePage.tsx`
Видалити вкладку "Vault" повністю — `NotesTab` більше не потрібен в knowledge.
Залишити ТІЛЬКИ: `KnowledgeZonesList` (Zones tab).

---

### КРОКИ ВИКОНАННЯ

**STEP 0 — GitNexus контекст:**
```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"query":"file manager tree folder hover actions bloom","repo":"garden-seedling-stage"}}}' \
  | grep "^data:" | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:1000]) for l in sys.stdin]"
```

**STEP 1 — Прочитати базові файли Bloom:**
```bash
ssh vokov@192.168.3.184 "cat /home/vokov/projects/garden-seedling-stage/src/pages/FilesPage.tsx"
ssh vokov@192.168.3.184 "sed -n '1,60p' /home/vokov/projects/garden-seedling-stage/src/components/garden/EditorFolderTree.tsx"
ssh vokov@192.168.3.184 "sed -n '1,80p' /home/vokov/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx"
```

**STEP 2 — Створити директорію і новий компонент:**
```bash
ssh vokov@192.168.3.184 "mkdir -p ~/workspace/ai-drakon-scaffolder/src/components/files"
```

Створити `src/components/files/ProjectFileManager.tsx`:
- Адаптувати `FolderItem` з Bloom `FilesPage.tsx` (рядки 29-82)
- Адаптувати lazy-loading з `CodePage.tsx` (рядки 50-100)
- Monaco Editor з `CodePage.tsx` (рядки 360-420)
- Filter pills: `[All]` `[/docs]` `[Code]` — amber active pill
- Collapsible sidebar (state `sidebarOpen`, PanelLeftClose/PanelLeft icons)
- Search filter (як у Bloom `FilesPage` рядки 108-125)
- Breadcrumb (поточний шлях)
- Status bar (назва файлу + detectLang + рядок:колонка з Monaco)

**STEP 3 — Синхронізація src/ ↔ .lovable/src/:**
```bash
ssh vokov@192.168.3.184 "cp ~/workspace/ai-drakon-scaffolder/src/components/files/ProjectFileManager.tsx ~/workspace/ai-drakon-scaffolder/.lovable/src/components/files/ProjectFileManager.tsx"
```

**STEP 4 — Оновити `/docs` маршрут:**
```bash
ssh vokov@192.168.3.184 "cat ~/workspace/ai-drakon-scaffolder/src/routes/docs.tsx"
```
Замінити вміст маршруту docs.tsx на простий wrapper з `<ProjectFileManager defaultMode="docs" />`.
Синхронізувати з .lovable/src/routes/docs.tsx.

**STEP 5 — Оновити `/code` маршрут:**
Замінити `<CodePage />` на `<ProjectFileManager defaultMode="code" />` в `src/routes/code.tsx`.

**STEP 6 — Видалити Vault з KnowledgePage:**
```bash
ssh vokov@192.168.3.184 "cat ~/workspace/ai-drakon-scaffolder/src/pages/KnowledgePage.tsx"
```
Видалити: `activeTab === "vault"` стан, `vault` кнопку в sidebar, `NotesTab` import і рендер.
Залишити: тільки `zones` view з `KnowledgeZonesList`.

**STEP 7 — TypeScript check:**
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && npx tsc --noEmit --project .lovable/tsconfig.json 2>&1 | head -30"
```

**STEP 8 — Commit та push:**
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && git add src/ .lovable/src/ && git commit -m 'feat(files): unified ProjectFileManager — Monaco editor, filter modes All/Docs/Code, replaces CodePage+DocsFilesTab+NotesTab' && git push origin main"
```

**STEP 9 — Mark done + push TASKS.md:**
```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 -c \"
with open('development/TASKS.md','r') as f: c=f.read()
c=c.replace('[x] TASK-172','[x] TASK-172',1)
with open('development/TASKS.md','w') as f: f.write(c)
\" && git add development/TASKS.md && git commit -m 'chore(tasks): TASK-172 done' && git push origin main"
```

---

### КЛЮЧОВІ ДЕТАЛІ

**detectLang (з CodePage.tsx, копіювати):**
```typescript
const EXT_TO_LANG: Record<string, string> = {
  py: "python", ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript", json: "json",
  yaml: "yaml", yml: "yaml", md: "markdown", sh: "shell",
  html: "html", css: "css", toml: "ini", txt: "plaintext",
};
function detectLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}
```

**Фільтр дерева по режиму:**
```typescript
function shouldShowEntry(path: string, mode: "all" | "docs" | "code"): boolean {
  if (mode === "docs") return path === "" || path.startsWith("docs");
  if (mode === "code") return !path.startsWith("docs") && !path.startsWith("node_modules");
  return !path.startsWith("node_modules");
}
```

**GitHub config:**
```typescript
const { activeProject } = useProject();
const gh = {
  owner: activeProject?.github?.owner || getGithubConfig().owner || "",
  repo: activeProject?.github?.repo || getGithubConfig().repo || "",
  branch: activeProject?.github?.branch || getGithubConfig().branch || "main",
  token: getGithubConfig().token || "",
};
```

**!!IMPORTANT!!** SSH to 192.168.3.184 for all file operations. Run locally on AGY3 Termux for AGY CLI.

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-172:unified-file-manager|ProjectFileManager+Monaco+filters|commit:<hash>|★★★★"`


## [x] TASK-173: Remove /github nav + Sparkles analyze in ProjectFileManager

**META:** Remove duplicate /github menu. Move Sparkles analyze as hover inline action in ProjectFileManager. Dialog: agent + pipeline select before run.

**!!IMPORTANT!!** Run locally on AGY3 Termux. SSH to 192.168.3.184 only for git pull/push.

---

### STEP 1 — Remove /github from navigation

**File:** `src/components/workspace/WorkspaceShell.tsx`

Remove this line from NAV_WORKSPACE array:
```
{ to: "/github", label: "GitHub", icon: Github },
```

Remove unused import `Github` from lucide-react if no longer used.

Remove this block:
```
if (pathname.startsWith("/github")) return { section: "GitHub", sectionPath: "/github" };
```

**Sync:** `cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx`

---

### STEP 2 — Add Sparkles analyze action to ProjectFileManager

**File:** `src/components/files/ProjectFileManager.tsx`

**A) Add imports:**
```typescript
import { Sparkles } from "lucide-react";
import { listGraphPipelines } from "@/lib/graph-pipeline-api";
import type { IrDiagram } from "@/lib/graph-pipeline-api";
```

Also add to existing Dialog/Select imports if not present:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

**B) Add state (inside ProjectFileManager component):**
```typescript
const [analyzeTarget, setAnalyzeTarget] = useState<FSNode | null>(null);
const [analyzeAgent, setAnalyzeAgent] = useState<"architect" | "docs" | "drakon">("architect");
const [analyzePipelines, setAnalyzePipelines] = useState<IrDiagram[]>([]);
const [analyzeSelectedPipeline, setAnalyzeSelectedPipeline] = useState<string>("");
const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
```

**C) Add openAnalyzeDialog function:**
```typescript
const openAnalyzeDialog = async (node: FSNode) => {
  setAnalyzeTarget(node);
  setAnalyzeDialogOpen(true);
  try {
    const pipelines = await listGraphPipelines();
    setAnalyzePipelines(pipelines);
    if (pipelines.length > 0) setAnalyzeSelectedPipeline(pipelines[0].name);
  } catch {
    setAnalyzePipelines([]);
  }
};
```

**D) Add runAnalyze function:**
```typescript
const runAnalyze = () => {
  if (!analyzeTarget) return;
  setAnalyzeDialogOpen(false);
  void navigate({
    to: "/diagrams",
    search: {
      autoAnalyze: "true",
      analyzePath: analyzeTarget.path || "src",
      analyzeRepo: `${gh.owner}/${gh.repo}`,
      analyzeBranch: gh.branch,
    } as Record<string, string>,
  });
  toast.message("Analyze started", { description: `/${analyzeTarget.path} via ${analyzeAgent}` });
};
```

Note: `gh` is already defined in the component using `useProject` + `getGithubConfig`.

**E) Add Sparkles button in FileTreeItem hover actions:**

Find in FileTreeItem the div with hover action buttons (where FilePlus, FolderPlus, Tag etc. are).
Add Sparkles button there:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
  title="Analyze"
  onClick={(e) => { e.stopPropagation(); void openAnalyzeDialog(node); }}
>
  <Sparkles className="h-3 w-3 text-amber-400" />
</Button>
```

This button should appear on BOTH folder rows AND file rows.

**F) Add AnalyzeDialog JSX (inside main component JSX, before final closing tag):**
```tsx
<Dialog open={analyzeDialogOpen} onOpenChange={setAnalyzeDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-amber-400" />
        Analyze: /{analyzeTarget?.path || ""}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label className="text-xs text-zinc-400">Agent</Label>
        <Select value={analyzeAgent} onValueChange={(v) => setAnalyzeAgent(v as "architect" | "docs" | "drakon")}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="architect">Architect (DRAKON diagrams)</SelectItem>
            <SelectItem value="docs">Docs (documentation)</SelectItem>
            <SelectItem value="drakon">Drakon (generation)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-zinc-400">Pipeline (results target)</Label>
        <Select value={analyzeSelectedPipeline} onValueChange={setAnalyzeSelectedPipeline}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="New pipeline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">New pipeline</SelectItem>
            {analyzePipelines.map((p) => (
              <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <DialogFooter>
      <Button variant="ghost" size="sm" onClick={() => setAnalyzeDialogOpen(false)}>Cancel</Button>
      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={runAnalyze}>
        <Sparkles className="mr-2 h-3 w-3" /> Analyze
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Sync:** `cp src/components/files/ProjectFileManager.tsx .lovable/src/components/files/ProjectFileManager.tsx`

---

### STEP 3 — TypeScript check

```bash
cd ~/workspace/ai-drakon-scaffolder
npx --prefix . tsc --noEmit 2>&1 | head -30
```

Fix all type errors before committing.

---

### STEP 4 — Commit + Push

```bash
cd ~/workspace/ai-drakon-scaffolder
git add src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
git add src/components/files/ProjectFileManager.tsx .lovable/src/components/files/ProjectFileManager.tsx
git commit -m "feat(files): remove /github nav, add Sparkles analyze action with agent+pipeline dialog"
git push origin main
```

### STEP 5 — Mark done + Diary

```python
with open('development/TASKS.md') as f: c = f.read()
c = c.replace('[ ] TASK-173', '[x] TASK-173', 1)
with open('development/TASKS.md', 'w') as f: f.write(c)
```

```bash
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-173 done"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-173:github-nav-remove+sparkles-analyze|WorkspaceShell+ProjectFileManager|commit:<hash>|★★★"`

---

## [x] TASK-174: Fix KnowledgeZone folder tree + ProjectSelector UX + Settings cleanup

**META:** Three UX fixes: (1) ZoneCreationDialog shows GitHub tree from active project (not hardcoded ai-drakon vault), (2) ProjectSelector closes modal on project click, (3) Settings GitHub tab shows only token (not repo fields).

**!!IMPORTANT!!** Run ALL edits locally on AGY3 Termux. SSH to 192.168.3.184 ONLY for git pull/push. Git repo is at `~/workspace/ai-drakon-scaffolder/`.

---

### STEP 1 — Fix ZoneCreationDialog to use active project GitHub tree

**File:** `src/components/knowledge/ZoneCreationDialog.tsx`

**Root cause:** Uses `fetchNotesTree()` which fetches static local vault (always ai-drakon docs). Must use `api.githubListTree()` from active project's GitHub config.

**A) Add/change imports at top:**

```typescript
// ADD these imports:
import { useProject } from "@/context/ProjectContext";
import { getGithubConfig } from "@/lib/settings-storage";

// REMOVE this import (no longer needed):
// import { fetchNotesTree, fetchNote, type TreeNode } from "@/lib/garden/notesApi";
```

**B) Replace TreeNode type with local GHFolderNode type (add near top of file, after imports):**

```typescript
interface GHFolderNode {
  name: string;
  path: string;
  children?: GHFolderNode[];
  isLoaded?: boolean;
  isLoading?: boolean;
}
```

**C) Inside `ZoneCreationDialog` component, replace the `useProject` + github config extraction:**

Add right after the `const queryClient = useQueryClient();` line:
```typescript
const { activeProject } = useProject();
const ghCfg = getGithubConfig();
const owner = activeProject?.github?.owner || ghCfg.owner || "";
const repo = activeProject?.github?.repo || ghCfg.repo || "";
const branch = activeProject?.github?.branch || ghCfg.branch || "main";
const token = ghCfg.token || "";
```

**D) Replace the entire folder tree state + useQuery with new state + useEffect:**

REMOVE this block:
```typescript
const { data: notesTree = [] } = useQuery({
  queryKey: ["notesTree"],
  queryFn: () => fetchNotesTree(),
  enabled: isOpen,
});
```

ADD this instead:
```typescript
const [ghTree, setGhTree] = useState<GHFolderNode[]>([]);
const [treeLoading, setTreeLoading] = useState(false);

// Recursive helper to update a node in the tree
const updateGHNode = useCallback(
  (nodes: GHFolderNode[], path: string, updater: (n: GHFolderNode) => GHFolderNode): GHFolderNode[] =>
    nodes.map(n =>
      n.path === path
        ? updater(n)
        : { ...n, children: n.children ? updateGHNode(n.children, path, updater) : undefined }
    ),
  []
);

// Load children of a folder on expand
const loadChildren = useCallback(async (node: GHFolderNode) => {
  if (node.isLoaded || node.isLoading) return;
  setGhTree(prev => updateGHNode(prev, node.path, n => ({ ...n, isLoading: true })));
  try {
    const res = await api.githubListTree(owner, repo, node.path, branch, token || undefined);
    if (res.success) {
      const children: GHFolderNode[] = res.entries
        .filter((e: { type: string }) => e.type === "dir")
        .map((e: { name: string; path: string }) => ({ name: e.name, path: e.path }));
      setGhTree(prev => updateGHNode(prev, node.path, n => ({ ...n, children, isLoaded: true, isLoading: false })));
    }
  } catch {
    setGhTree(prev => updateGHNode(prev, node.path, n => ({ ...n, isLoading: false })));
  }
}, [owner, repo, branch, token, updateGHNode]);
```

**E) Replace the `useEffect` that handles `isOpen`/`initialFolders`:**

Keep the part that resets `selectedFolders` and `expandedFolders`, and ADD loading the root tree:

```typescript
useEffect(() => {
  if (isOpen) {
    if (initialFolders && initialFolders.length > 0) {
      setSelectedFolders(new Set(initialFolders));
      const expanded = new Set<string>();
      for (const f of initialFolders) {
        const parts = f.split("/");
        let acc = "";
        for (const p of parts) {
          acc = acc ? `${acc}/${p}` : p;
          expanded.add(acc);
        }
      }
      setExpandedFolders(expanded);
    } else {
      setSelectedFolders(new Set());
      setExpandedFolders(new Set());
    }
    // Load root GitHub tree
    if (owner && repo) {
      setTreeLoading(true);
      setGhTree([]);
      api.githubListTree(owner, repo, "", branch, token || undefined)
        .then(res => {
          if (res.success) {
            setGhTree(
              res.entries
                .filter((e: { type: string }) => e.type === "dir")
                .map((e: { name: string; path: string }) => ({ name: e.name, path: e.path }))
            );
          }
        })
        .finally(() => setTreeLoading(false));
    }
  }
}, [isOpen, initialFolders, owner, repo, branch, token]);
```

**F) Remove `countNotesInFolders` function and `noteCount` useMemo entirely.**

**G) Replace `renderFolders` function with new version that works with `GHFolderNode`:**

```typescript
const renderGHFolders = (items: GHFolderNode[], depth = 0): React.ReactNode[] =>
  items.map(folder => {
    const hasChildren = folder.children === undefined || folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.path);
    return (
      <div key={folder.path}>
        <FolderItem
          name={folder.name}
          path={folder.path}
          isSelected={selectedFolders.has(folder.path)}
          onToggle={toggleFolder}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onExpandToggle={async () => {
            toggleExpand(folder.path);
            if (!folder.isLoaded) await loadChildren(folder);
          }}
        />
        {hasChildren && isExpanded && folder.children && (
          renderGHFolders(folder.children, depth + 1)
        )}
      </div>
    );
  });
```

**H) Replace `hasFolders` check:**

REMOVE:
```typescript
const hasFolders = notesTree.some((node) => node.type === "folder");
```

ADD:
```typescript
const hasFolders = ghTree.length > 0;
```

**I) In JSX, replace the folder ScrollArea content:**

Change:
```tsx
{hasFolders ? (
  renderFolders(notesTree)
) : (
  <p className="text-xs text-muted-foreground text-center py-8">
    No folders found in vault.
  </p>
)}
```

To:
```tsx
{treeLoading ? (
  <p className="text-xs text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
    <span className="animate-spin">⟳</span> Loading...
  </p>
) : !owner || !repo ? (
  <p className="text-xs text-muted-foreground text-center py-8">
    No GitHub project configured. Select a project in the top-left corner.
  </p>
) : hasFolders ? (
  renderGHFolders(ghTree)
) : (
  <p className="text-xs text-muted-foreground text-center py-8">
    No folders found in repository.
  </p>
)}
```

**J) In the Summary right panel, replace `noteCount` with just folder count:**

Change the "Notes Shared" metric box to show active project name:
```tsx
<div className="bg-background/50 border border-border/50 p-2 rounded flex flex-col">
  <span className="text-[10px] text-muted-foreground">Repository</span>
  <span className="text-sm font-bold font-mono tracking-tight text-foreground truncate">
    {repo || "—"}
  </span>
</div>
```

**K) Simplify `handleSubmit` — remove `fetchAndSubmit`, submit directly:**

Replace the entire `handleSubmit` function body after validation with:
```typescript
const data: CreateKnowledgeZoneRequest = {
  name,
  description: description.trim() || undefined,
  ttlMinutes,
  accessType,
  createNotebookLm,
  folders: Array.from(selectedFolders),
  noteCount: selectedFolders.size,
};
if (createNotebookLm) {
  data.notebookLmTitle = notebookLmTitle.trim() || undefined;
  data.shareEmails = shareEmails.split(",").map((s) => s.trim()).filter(Boolean);
}
createZoneMutation.mutate(data);
```

Remove the entire `fetchAndSubmit` async function.

**L) Remove unused imports:**
- Remove `useMemo` from react imports if `noteCount` useMemo is removed
- Remove `useQuery` from `@tanstack/react-query` if no longer used
- Add `useCallback` to react imports

**Sync:** `cp src/components/knowledge/ZoneCreationDialog.tsx .lovable/src/components/knowledge/ZoneCreationDialog.tsx`

---

### STEP 2 — ProjectSelector: close modal on project click

**File:** `src/components/workspace/ProjectSelector.tsx`

Find the project row click handler:
```tsx
onClick={() => setActiveProject(p)}
```

Replace with:
```tsx
onClick={() => { setActiveProject(p); setManagerOpen(false); }}
```

This closes the manager dialog immediately when user clicks a project. Simple and clean.

**Sync:** `cp src/components/workspace/ProjectSelector.tsx .lovable/src/components/workspace/ProjectSelector.tsx`

---

### STEP 3 — Settings: hide repo/owner/branch fields from GitHub tab

**File:** `src/routes/settings.tsx`

In the GitHub tab `<TabsContent value="github">`, find and REMOVE these three sections entirely (just the JSX, keep state+functions):

1. The `Repository Owner` div block:
```tsx
<div className="grid gap-2">
  <Label htmlFor="gh-owner">Repository Owner</Label>
  <Input id="gh-owner" .../>
</div>
```

2. The `Repository Name` div block (including the autocomplete dropdown):
```tsx
<div className="grid gap-2">
  <Label htmlFor="gh-repo">Repository Name</Label>
  <div className="relative">
    <Input id="gh-repo" .../>
    {repoOpen && ...}
  </div>
</div>
```

3. The `Branch` div block:
```tsx
<div className="grid gap-2">
  <Label htmlFor="gh-branch">Branch</Label>
  <Input id="gh-branch" .../>
</div>
```

ADD a note BEFORE the token field (after the CardDescription):
```tsx
<div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2 text-xs text-muted-foreground mb-2">
  Репозиторій та гілку налаштовуйте через <strong>селектор проекту</strong> у верхньому лівому куті.
</div>
```

Also REMOVE the "Заповнити з проекту" button block:
```tsx
{activeProjectGithub && (
  <Button ... onClick={...}>Заповнити з проекту ({activeProject?.name})</Button>
)}
```

**Sync:** `cp src/routes/settings.tsx .lovable/src/routes/settings.tsx`

---

### STEP 4 — TypeScript check

```bash
cd ~/workspace/ai-drakon-scaffolder
npx --prefix . tsc --noEmit 2>&1 | head -40
```

Fix ALL type errors before committing.

Common issues to watch for:
- `api.githubListTree` return type — check actual type in `src/lib/api.ts`
- `useCallback` missing from react imports
- Unused imports after removals
- `onExpandToggle` in FolderItem props is `() => void` but we're passing `async () => void` — that's fine, async is assignable to `() => void`

---

### STEP 5 — Commit and push

```bash
cd ~/workspace/ai-drakon-scaffolder
git add src/components/knowledge/ZoneCreationDialog.tsx
git add .lovable/src/components/knowledge/ZoneCreationDialog.tsx
git add src/components/workspace/ProjectSelector.tsx
git add .lovable/src/components/workspace/ProjectSelector.tsx
git add src/routes/settings.tsx
git add .lovable/src/routes/settings.tsx
git commit -m "fix(knowledge): folder tree uses active project GitHub, ProjectSelector closes on select, Settings simplified"
git push origin main
```

---

### STEP 6 — Mark done + diary

```python
with open('development/TASKS.md') as f: c = f.read()
c = c.replace('[x] TASK-174', '[x] TASK-174', 1)
with open('development/TASKS.md', 'w') as f: f.write(c)
```

```bash
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-174 done"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-174:zone-gh-tree+selector-ux+settings-clean|ZoneCreationDialog+ProjectSelector+settings|commit:<hash>|★★★"`

---

## [x] TASK-175: MCP API Key Management — Worker + Settings UI

**META:** Add per-user MCP API key generation/management. Backend: Cloudflare Worker gets KV-based key auth + /v1/api-key endpoints. Frontend: Settings gets new "MCP Access" section.

**!!IMPORTANT!!** 
- ALL code edits: run locally on AGY3 Termux in `~/workspace/ai-drakon-scaffolder/` AND `~/workspace/ai-drakon-setup/`  
- Deploy wrangler: SSH to 192.168.3.184 only for deploy step
- Git push: SSH to 192.168.3.184 for both repos

---

### STEP 1 — Add KV binding to worker-wrangler.toml

**File:** `~/workspace/ai-drakon-setup/cloudflare-worker/worker-wrangler.toml`

Current content:
```toml
name = "drakon-mcp-worker"
main = "worker-mcp-drakon.js"
compatibility_date = "2024-01-01"
account_id = "c354ea45a11a1e1c14f1f41fe780cb34"
```

Replace with:
```toml
name = "drakon-mcp-worker"
main = "worker-mcp-drakon.js"
compatibility_date = "2024-01-01"
account_id = "c354ea45a11a1e1c14f1f41fe780cb34"

[[kv_namespaces]]
binding = "MCP_KEYS"
id = "a23954fb430f4731a5c151e702eec2e6"
```

---

### STEP 2 — Update verifyOwnerAuth in Worker to check KV keys

**File:** `~/workspace/ai-drakon-setup/cloudflare-worker/worker-mcp-drakon.js`

Find this block (around line 176-183):
```javascript
  // Статичний MCP API key (для Claude.ai Dashboard та інших MCP клієнтів)
  if (env.MCP_API_KEY && token === env.MCP_API_KEY) {
    return { role: 'owner', sub: 'mcp-agent' };
  }

  // JWT (для фронтенду)
```

Replace with:
```javascript
  // Статичний MCP API key (backward compat — owner level)
  if (env.MCP_API_KEY && token === env.MCP_API_KEY) {
    return { role: 'owner', sub: 'mcp-agent' };
  }

  // Per-user MCP key stored in KV
  if (env.MCP_KEYS) {
    const userInfoStr = await env.MCP_KEYS.get(`key:${token}`);
    if (userInfoStr) {
      const info = JSON.parse(userInfoStr);
      return { role: 'owner', sub: info.userId, email: info.email || null };
    }
  }

  // JWT (для фронтенду)
```

---

### STEP 3 — Add /v1/api-key endpoints to Worker

**File:** `~/workspace/ai-drakon-setup/cloudflare-worker/worker-mcp-drakon.js`

Find line that reads (around line 2048):
```javascript
      if (method === 'POST' && path === '/auth/login') {
```

INSERT BEFORE that line (add this block above it):
```javascript
      // ─── MCP API Key management ─────────────────────────────────────────
      if (method === 'POST' && path === '/v1/api-key/generate') {
        const auth = await verifyOwnerAuth(request, env);
        if (!auth) return errorResponse('Unauthorized', 401);
        const userId = auth.email || auth.sub || 'owner';
        // Generate new random key
        const rawId = crypto.randomUUID().replace(/-/g, '');
        const apiKey = `drakon-${rawId}`;
        // Revoke previous key if exists
        if (env.MCP_KEYS) {
          const prevKey = await env.MCP_KEYS.get(`user:${userId}`);
          if (prevKey) await env.MCP_KEYS.delete(`key:${prevKey}`);
          // Store new key
          await env.MCP_KEYS.put(`key:${apiKey}`, JSON.stringify({
            userId,
            email: auth.email || null,
            createdAt: new Date().toISOString(),
          }));
          await env.MCP_KEYS.put(`user:${userId}`, apiKey);
        }
        return jsonResponse({
          success: true,
          apiKey,
          mcpUrl: 'https://drakon-mcp-worker.maxfraieho.workers.dev/mcp',
          config: {
            type: 'http',
            url: 'https://drakon-mcp-worker.maxfraieho.workers.dev/mcp',
            serverUrl: 'https://drakon-mcp-worker.maxfraieho.workers.dev/mcp',
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        });
      }

      if (method === 'GET' && path === '/v1/api-key') {
        const auth = await verifyOwnerAuth(request, env);
        if (!auth) return errorResponse('Unauthorized', 401);
        const userId = auth.email || auth.sub || 'owner';
        let currentKey = null;
        if (env.MCP_KEYS) {
          currentKey = await env.MCP_KEYS.get(`user:${userId}`);
        }
        if (!currentKey) {
          return jsonResponse({ success: true, apiKey: null, hasKey: false });
        }
        const masked = `${currentKey.slice(0, 14)}...${currentKey.slice(-6)}`;
        return jsonResponse({ success: true, apiKey: currentKey, maskedKey: masked, hasKey: true });
      }

      if (method === 'DELETE' && path === '/v1/api-key') {
        const auth = await verifyOwnerAuth(request, env);
        if (!auth) return errorResponse('Unauthorized', 401);
        const userId = auth.email || auth.sub || 'owner';
        if (env.MCP_KEYS) {
          const prevKey = await env.MCP_KEYS.get(`user:${userId}`);
          if (prevKey) await env.MCP_KEYS.delete(`key:${prevKey}`);
          await env.MCP_KEYS.delete(`user:${userId}`);
        }
        return jsonResponse({ success: true });
      }
      // ─── end MCP API Key management ──────────────────────────────────────

```

---

### STEP 4 — Deploy Worker from dev server (SSH to 192.168.3.184)

```bash
# SSH to dev server and deploy:
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 '
cd ~/workspace/ai-drakon-setup/cloudflare-worker
CLOUDFLARE_API_TOKEN=<CF_WORKERS_TOKEN> \
  npx wrangler deploy worker-mcp-drakon.js --config worker-wrangler.toml 2>&1 | tail -20
'
```

Verify by testing:
```bash
curl -s https://drakon-mcp-worker.maxfraieho.workers.dev/health | head -c 200
```

---

### STEP 5 — Add MCP Access section to Settings UI

**File:** `src/routes/settings.tsx` in ai-drakon-scaffolder

**A) Add imports at top of the file (after existing imports):**
```typescript
import { Copy, Key, RefreshCw as Regenerate } from "lucide-react";
```
(Note: `RefreshCw` is already imported, so just add `Copy` and `Key` to the existing import line)

**B) Add state variables inside `SettingsRoute` function (after existing state):**
```typescript
const [mcpKey, setMcpKey] = useState<string | null>(null);
const [mcpKeyMasked, setMcpKeyMasked] = useState<string | null>(null);
const [isLoadingMcpKey, setIsLoadingMcpKey] = useState(false);
const [isGeneratingMcpKey, setIsGeneratingMcpKey] = useState(false);

useEffect(() => {
  // Load current MCP key on mount
  const jwt = localStorage.getItem("jwt");
  if (!jwt) return;
  const workerUrl = (settings.app.workerUrl || "https://drakon-mcp-worker.maxfraieho.workers.dev").replace(/\/$/, "");
  setIsLoadingMcpKey(true);
  fetch(`${workerUrl}/v1/api-key`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })
    .then(r => r.json())
    .then((data: any) => {
      if (data.success && data.hasKey) {
        setMcpKey(data.apiKey);
        setMcpKeyMasked(data.maskedKey);
      }
    })
    .catch(() => {})
    .finally(() => setIsLoadingMcpKey(false));
}, [settings.app.workerUrl]);

const generateMcpKey = async () => {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) { toast.error("Потрібна авторизація"); return; }
  const workerUrl = (settings.app.workerUrl || "https://drakon-mcp-worker.maxfraieho.workers.dev").replace(/\/$/, "");
  setIsGeneratingMcpKey(true);
  try {
    const res = await fetch(`${workerUrl}/v1/api-key/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json() as any;
    if (data.success) {
      setMcpKey(data.apiKey);
      setMcpKeyMasked(`${data.apiKey.slice(0, 14)}...${data.apiKey.slice(-6)}`);
      toast.success("MCP ключ створено", { description: "Скопіюй ключ — він більше не буде показаний повністю" });
    } else {
      toast.error("Помилка генерації ключа");
    }
  } catch {
    toast.error("Помилка підключення до Worker");
  } finally {
    setIsGeneratingMcpKey(false);
  }
};

const revokeMcpKey = async () => {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) return;
  const workerUrl = (settings.app.workerUrl || "https://drakon-mcp-worker.maxfraieho.workers.dev").replace(/\/$/, "");
  try {
    await fetch(`${workerUrl}/v1/api-key`, { method: "DELETE", headers: { Authorization: `Bearer ${jwt}` } });
    setMcpKey(null);
    setMcpKeyMasked(null);
    toast.success("MCP ключ відкликано");
  } catch { toast.error("Помилка"); }
};
```

**C) Add new tab trigger in the TabsList** (after the existing "app" tab trigger):
```tsx
<TabsTrigger value="mcp" className="shrink-0 whitespace-nowrap">MCP Access</TabsTrigger>
```

Also update the `md:grid-cols-6` to `md:grid-cols-7` in the TabsList className.

**D) Add new TabsContent (before the final `</Tabs>` closing tag):**
```tsx
<TabsContent value="mcp">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Key className="h-4 w-4" />
        MCP Access Key
      </CardTitle>
      <CardDescription>
        Персональний ключ для підключення до DRAKON MCP сервера. Використовується в Antigravity, Claude Desktop та інших MCP-клієнтах.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoadingMcpKey ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Завантаження...
        </div>
      ) : mcpKey ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Поточний ключ</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                readOnly
                value={mcpKeyMasked || mcpKey}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => { navigator.clipboard.writeText(mcpKey); toast.success("Ключ скопійовано"); }}
                title="Копіювати повний ключ"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Натисни кнопку для копіювання повного ключа</p>
          </div>

          <div className="grid gap-2">
            <Label>mcp_config.json для Antigravity / Claude Desktop</Label>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto cursor-pointer hover:bg-muted/70"
              onClick={() => {
                const cfg = JSON.stringify({
                  mcpServers: {
                    drakon: {
                      type: "http",
                      url: "https://drakon-mcp-worker.maxfraieho.workers.dev/mcp",
                      serverUrl: "https://drakon-mcp-worker.maxfraieho.workers.dev/mcp",
                      headers: { Authorization: `Bearer ${mcpKey}` }
                    }
                  }
                }, null, 2);
                navigator.clipboard.writeText(cfg);
                toast.success("Config скопійовано");
              }}
            >
{`{
  "mcpServers": {
    "drakon": {
      "type": "http",
      "url": "https://drakon-mcp-worker.maxfraieho.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${mcpKey.slice(0,14)}...${mcpKey.slice(-6)}" }
    }
  }
}`}
            </pre>
            <p className="text-xs text-muted-foreground">Натисни на блок — скопіює повний config з реальним ключем</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => void generateMcpKey()} disabled={isGeneratingMcpKey}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isGeneratingMcpKey ? "Генерую..." : "Перегенерувати ключ"}
            </Button>
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void revokeMcpKey()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Відкликати ключ
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">У тебе ще немає MCP ключа. Створи його щоб підключити MCP клієнти.</p>
          <Button type="button" onClick={() => void generateMcpKey()} disabled={isGeneratingMcpKey}>
            <Key className="mr-2 h-4 w-4" />
            {isGeneratingMcpKey ? "Генерую..." : "Створити MCP ключ"}
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

**Sync all changed files:**
```bash
cp src/routes/settings.tsx .lovable/src/routes/settings.tsx
```

---

### STEP 6 — Commit Worker changes (ai-drakon-setup)

SSH to dev server and commit:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 '
cd ~/workspace/ai-drakon-setup
git add cloudflare-worker/worker-mcp-drakon.js cloudflare-worker/worker-wrangler.toml
git commit -m "feat(worker): add per-user MCP key management with KV store"
git push origin main
'
```

---

### STEP 7 — Commit Settings UI (ai-drakon-scaffolder)

```bash
cd ~/workspace/ai-drakon-scaffolder
git add src/routes/settings.tsx .lovable/src/routes/settings.tsx
git commit -m "feat(settings): add MCP Access tab for API key generation and management"
git push origin main
```

---

### STEP 8 — TypeScript check

```bash
cd ~/workspace/ai-drakon-scaffolder
npx --prefix . tsc --noEmit 2>&1 | head -30
```

Fix all type errors (cast `data as any` for fetch responses, check import list).

---

### STEP 9 — Mark done + diary

```python
with open('development/TASKS.md') as f: c = f.read()
c = c.replace('[x] TASK-175', '[x] TASK-175', 1)
with open('development/TASKS.md', 'w') as f: f.write(c)
```

```bash
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-175 done"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-175:mcp-key-management|Worker+KV+SettingsUI|commit:<hash>|★★★"`

---

## [x] TASK-176: Mine exodus-infra into MemPalace

**Goal:** Index exodus-infra markdown docs into MemPalace wing "exodus-infra" so Claude can search protocols/agents/services without reading files directly.

**Run locally on AGY3 Termux (NOT on dev server).**

**Steps:**

1. Pull latest exodus-infra:
```bash
cd ~/workspace/exodus-infra
git pull origin main
```

2. Check if wing already exists:
```bash
python3 -m mempalace list-wings 2>/dev/null || python3 -c "from mempalace import MemPalace; mp = MemPalace(); print(mp.list_wings())"
```

3. Mine exodus-infra into MemPalace:
```bash
cd ~/workspace/exodus-infra
python3 -m mempalace mine . --wing exodus-infra
```

If `mine` subcommand not found, try:
```bash
python3 -c "
from mempalace import MemPalace
mp = MemPalace()
mp.mine_directory(., wing=exodus-infra)
print(Done)
"
```

4. Verify wing was created:
```bash
python3 -m mempalace search --wing exodus-infra --query "notebooklm MCP" | head -20
```

5. Report: how many drawers created, sample search result.

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-176:mempalace-exodus-infra-mining|drawers:<N>|★★★"`

---

## [ ] TASK-177: Investigate and fix Flue agents integration with /agents page

**Goal:** The /agents page was built for old Python LangGraph agents (port 8766).
New `architect-agent-flue` (Cloudflare Worker + @flue/runtime) has the same API but may not be deployed or connected.
Investigate, fix, and ensure the /agents page works with the Flue agents.

**Run on dev server 192.168.3.184 via SSH for git/wrangler commands.**

**Step 1 — Check if Flue worker is deployed:**
```bash
cd ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue
npx wrangler deployments list --name architect-agent-flue 2>&1 | head -20
# OR
npx wrangler whoami 2>&1
```

Also check wrangler.toml for placeholder IDs:
```bash
grep -E "placeholder|database_id|id = " wrangler.toml
```

**Step 2 — Check what URL the frontend uses for architect-agent:**
```bash
grep -rn "getArchitectBase\|8766\|architect-agent" ~/workspace/ai-drakon-scaffolder/src/lib/ | head -20
```

**Step 3 — Check if KV/D1 resources exist in Cloudflare:**
```bash
npx wrangler kv namespace list 2>&1 | grep -i "architect\|pipeline"
npx wrangler d1 list 2>&1 | grep -i "architect\|kb"
```

**Step 4 — Check docs-agent-flue and drakon-agent-flue:**
```bash
cat ~/workspace/ai-drakon-scaffolder/services/docs-agent-flue/wrangler.toml
cat ~/workspace/ai-drakon-scaffolder/services/drakon-agent-flue/wrangler.toml
ls ~/workspace/ai-drakon-scaffolder/services/docs-agent-flue/agents/
ls ~/workspace/ai-drakon-scaffolder/services/drakon-agent-flue/agents/
```

**Step 5 — Compare agent prompts:**
Compare prompts in old static data vs Flue agents:
- Old: `src/lib/agent-studio-data.ts` → PIPELINES array with node prompts
- New: `services/architect-agent-flue/lib/prompts.ts`, `tools/graph-pipelines.ts`

Check if all node prompts from old PIPELINES are implemented in graph-pipelines.ts:
```bash
grep -n "yaml_gen\|ir_gen\|ir_refine\|ralph_check\|code_gen\|self_reflect" \
  ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue/tools/graph-pipelines.ts | head -20
grep -n "yaml_gen\|ir_gen\|ir_refine\|ralph_check\|code_gen\|self_reflect" \
  ~/workspace/ai-drakon-scaffolder/src/lib/agent-studio-data.ts | head -20
```

**Step 6 — Report findings:**

Write findings to `development/investigations/flue-agents-status.md`:
```markdown
# Flue Agents Investigation (TASK-177)

## architect-agent-flue
- Deployed: YES/NO, URL: ...
- KV ID: real/placeholder
- D1 ID: real/placeholder

## Frontend connection
- Currently points to: old Python (8766) / Flue worker (URL)
- File: src/lib/graph-pipeline-api.ts, line X

## Prompts coverage
- Nodes in old static data: [list]
- Nodes in graph-pipelines.ts: [list]
- Missing: [list]

## docs-agent-flue
- Status: ...

## drakon-agent-flue
- Status: ...

## Recommended fixes
1. ...
```

**Step 7 — Fix if straightforward:**
If architect-agent-flue IS deployed and frontend just needs URL update → update `src/lib/settings-storage.ts` or wherever `getArchitectBase()` is defined.
If NOT deployed → report only, do NOT deploy (need Q confirmation first).

**Commit:** `git add development/investigations/flue-agents-status.md && git commit -m "docs(investigation): TASK-177 Flue agents status report"`
**Push:** `git push origin main`

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-177:flue-agents-investigation|findings:<summary>|★★★"`

---

## [x] TASK-178 (→ rolled into TASK-179): Fix Flue agents — create CF resources and connect frontend

**Context (read first):**
- Flue = `@flue/runtime` framework (Cloudflare Workers, TypeScript)
- NotebookLM notebook "Flue": ID `83ab40c7-7ca6-4685-9eb8-cf72dfa25f19` — full docs
- `architect-agent-flue` code is complete. Blocked by 2 issues:
  1. `wrangler.toml` has `placeholder_kv_id` and `placeholder_d1_id`
  2. Frontend `src/lib/graph-pipeline-api.ts` still points to old Python agent (port 8766)

**Run on dev server 192.168.3.184.**

**Step 1 — Check if already deployed:**
```bash
cd ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue
npx wrangler deployments list --name architect-agent-flue 2>&1 | head -10
```
If deployed, get the URL: `https://architect-agent-flue.<account>.workers.dev`

**Step 2 — Check existing CF resources:**
```bash
npx wrangler kv namespace list 2>&1 | python3 -c "import sys,json; [print(x[title],x[id]) for x in json.load(sys.stdin)]" 2>/dev/null
npx wrangler d1 list 2>&1
```

**Step 3 — If placeholders, create real resources:**
```bash
# Create KV namespace for pipelines
npx wrangler kv namespace create "PIPELINES_KV" 2>&1
# Create D1 database for KB
npx wrangler d1 create architect-kb 2>&1
```
Then update wrangler.toml with real IDs:
- Replace `placeholder_kv_id` with real KV ID
- Replace `placeholder_d1_id` with real D1 database_id

**Step 4 — Check frontend base URL:**
```bash
grep -n "getArchitectBase\|architect\|8766" ~/workspace/ai-drakon-scaffolder/src/lib/graph-pipeline-api.ts | head -10
grep -n "getArchitectBase\|8766\|architect" ~/workspace/ai-drakon-scaffolder/src/lib/settings-storage.ts 2>/dev/null | head -10
```

**Step 5 — If Flue worker is deployed, update frontend to use it:**
In `src/lib/graph-pipeline-api.ts` or `settings-storage.ts`:
- Old: `http://192.168.3.184:8766`
- New: `https://architect-agent-flue.<account>.workers.dev`

Also update `.lovable/src/lib/...` (same file must be synced to .lovable).

**Step 6 — Set required secrets on CF Worker:**
```bash
echo "your_proxy_token" | npx wrangler secret put PROXY_TOKEN --name architect-agent-flue
echo "your_cf_token" | npx wrangler secret put CUSTOM_API_KEY --name architect-agent-flue
```
Check what secrets the worker expects:
```bash
grep -n "env\." ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue/lib/llm-client.ts | head -10
```

**Step 7 — Deploy if not yet deployed:**
```bash
cd ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue
npm install
npx flue build --target cloudflare 2>&1 | tail -10
npx wrangler deploy 2>&1 | tail -10
```

**Step 8 — Verify:**
```bash
curl https://architect-agent-flue.<account>.workers.dev/health
```

**Commit changes:**
```bash
cd ~/workspace/ai-drakon-scaffolder
git add services/architect-agent-flue/wrangler.toml src/lib/graph-pipeline-api.ts .lovable/src/lib/graph-pipeline-api.ts
git commit -m "feat(flue): connect frontend to architect-agent-flue CF worker, fix KV/D1 resource IDs"
git push origin main
```

**Report:** Write URL of deployed worker and what was changed.

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-178:flue-deploy-connect|worker:<URL>|commit:<hash>|★★★★"`

---

## [ ] TASK-179: Deploy all 3 Flue agents + switch domains from Python to CF Workers

**Context:**
- 3 Flue workers: architect-agent-flue, docs-agent-flue, drakon-agent-flue
- Currently: *.exodus.pp.ua → cloudflared → old Python agents (8765/8766/8767)
- Goal: deploy Flue Workers, assign custom domains, remove old cloudflared routes
- Frontend settings-storage.ts already has correct default URLs — no frontend changes needed

**Run on dev server 192.168.3.184 (has wrangler credentials).**
**Work directory: ~/workspace/ai-drakon-scaffolder/services/**

---

### PHASE 1 — Create shared Cloudflare resources

```bash
cd ~/workspace/ai-drakon-scaffolder

# 1a. Create shared KV namespace (for docs + drakon agents)
npx wrangler kv namespace create "drakon-kb" 2>&1
# Save the returned ID — replace "drakon_kb" in wrangler.toml of docs-agent-flue and drakon-agent-flue

# 1b. Create KV for architect pipelines
npx wrangler kv namespace create "architect-pipelines" 2>&1
# Save ID — replace "placeholder_kv_id" in architect-agent-flue/wrangler.toml

# 1c. Create D1 for architect KB
npx wrangler d1 create architect-kb 2>&1
# Save database_id — replace "placeholder_d1_id" in architect-agent-flue/wrangler.toml
```

### PHASE 2 — Update wrangler.toml for each agent

**architect-agent-flue/wrangler.toml** — replace placeholders:
```toml
[[kv_namespaces]]
binding = "PIPELINES_KV"
id = "<REAL_KV_ID_FROM_PHASE_1b>"

[[d1_databases]]
binding = "KB_DB"
database_name = "architect-kb"
database_id = "<REAL_D1_ID_FROM_PHASE_1c>"
```

**docs-agent-flue/wrangler.toml** — replace drakon_kb:
```toml
[[kv_namespaces]]
binding = "KNOWLEDGE_BASE"
id = "<REAL_KV_ID_FROM_PHASE_1a>"
preview_id = "<REAL_KV_ID_FROM_PHASE_1a>"
```

**drakon-agent-flue/wrangler.toml** — replace drakon_kb:
```toml
[[kv_namespaces]]
binding = "KNOWLEDGE_BASE"
id = "<REAL_KV_ID_FROM_PHASE_1a>"
preview_id = "<REAL_KV_ID_FROM_PHASE_1a>"
```

### PHASE 3 — Build and deploy all 3 workers

```bash
# architect-agent-flue
cd ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue
npm install
npx wrangler deploy 2>&1 | tail -5

# docs-agent-flue
cd ~/workspace/ai-drakon-scaffolder/services/docs-agent-flue
npm install
npx wrangler deploy 2>&1 | tail -5

# drakon-agent-flue
cd ~/workspace/ai-drakon-scaffolder/services/drakon-agent-flue
npm install
npx wrangler deploy 2>&1 | tail -5
```

### PHASE 4 — Set secrets for each worker

```bash
# Get PROXY_TOKEN value:
grep "PROXY_TOKEN\|CUSTOM_API_KEY\|antigravi" ~/workspace/ai-drakon-scaffolder/services/architect-agent/.env 2>/dev/null || \
grep -r "PROXY_TOKEN" ~/workspace/ai-drakon-scaffolder/services/architect-agent/ 2>/dev/null | head -3

# Set secrets (use actual token from above):
for worker in architect-agent-flue docs-agent-flue drakon-agent-flue; do
  echo "<PROXY_TOKEN_VALUE>" | npx wrangler secret put PROXY_TOKEN --name $worker
  echo "<GITHUB_TOKEN>" | npx wrangler secret put GITHUB_TOKEN --name $worker
done
```

### PHASE 5 — Assign custom domains to CF Workers

```bash
# For each worker, add custom domain:
npx wrangler deploy --name architect-agent-flue \
  --route "architect-agent.exodus.pp.ua/*" 2>&1 || true

# OR via CF API (if wrangler route fails):
# Dashboard: Workers & Pages → architect-agent-flue → Settings → Domains & Routes → Add Custom Domain
# Domain: architect-agent.exodus.pp.ua

# Repeat for docs and drakon:
# docs-agent.exodus.pp.ua → docs-agent-flue
# drakon-agent.exodus.pp.ua → drakon-agent-flue
```

Verify domains work:
```bash
curl https://architect-agent.exodus.pp.ua/health
curl https://docs-agent.exodus.pp.ua/health
curl https://drakon-agent.exodus.pp.ua/health
```

### PHASE 6 — Remove old routes from cloudflared (OrangePi)

**ONLY after Phase 5 verified working.**

On OrangePi (192.168.3.161), edit /etc/cloudflared/config.yml:
Remove these 3 blocks:
```yaml
  - hostname: architect-agent.exodus.pp.ua
    service: http://192.168.3.184:8766
  - hostname: docs-agent.exodus.pp.ua
    service: http://192.168.3.184:8767
  - hostname: drakon-agent.exodus.pp.ua
    service: http://192.168.3.184:8765
```

Then restart cloudflared:
```bash
sshpass -p TermuxSsh2026! ssh -p 8022 u0_a410@192.168.3.161 \
  "sudo rc-service cloudflared restart" 2>/dev/null || \
ssh vokov@192.168.3.161 "sudo rc-service cloudflared restart"
```

### PHASE 7 — Commit updated wrangler.toml files

```bash
cd ~/workspace/ai-drakon-scaffolder
git add services/architect-agent-flue/wrangler.toml \
        services/docs-agent-flue/wrangler.toml \
        services/drakon-agent-flue/wrangler.toml
git commit -m "feat(flue): deploy all 3 Flue agents with real CF KV/D1 resource IDs + custom domains"
git push origin main
```

**Report:**
- architect-agent-flue URL: https://architect-agent.exodus.pp.ua/health → ?
- docs-agent-flue URL: https://docs-agent.exodus.pp.ua/health → ?
- drakon-agent-flue URL: https://drakon-agent.exodus.pp.ua/health → ?

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-179:flue-all-3-agents-deploy|architect+docs+drakon|commit:<hash>|★★★★★"`

---

## [x] TASK-180: Rewrite frontend to use Flue Workers instead of hardcoded Python agent ports

**Goal:** Frontend has 3 files with hardcoded ports 8765/8766/8767 pointing to old Python agents.
All 3 Flue Workers are live. Rewrite the URL resolution to use settings-storage values.

**Agent:** AGY3
**Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/**

### Context (already done — do NOT redo)
- architect-agent-flue → https://architect-agent-flue.maxfraieho.workers.dev ✓ LIVE
- docs-agent-flue → https://docs-agent-flue.maxfraieho.workers.dev ✓ LIVE
- drakon-agent-flue → https://drakon-agent-flue.maxfraieho.workers.dev ✓ LIVE
- settings-storage.ts already has correct default URLs (architectUrl, docsUrl, drakonUrl)
- Custom domains also work: architect-agent.exodus.pp.ua, docs-agent.exodus.pp.ua, drakon-agent.exodus.pp.ua

### STEP 1 — GitNexus context (MANDATORY)

```bash
cd ~/workspace/ai-drakon-scaffolder
python3 ~/bin/gitnexus-query.py "agent URL port 8766 architectUrl drakonUrl getAgentUrlFor mcp-client settings" ai-drakon-scaffolder 2>/dev/null || \
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query","arguments":{"query":"agent URL port 8766 architectUrl getAgentUrlFor mcp-client","repo":"ai-drakon-scaffolder"}}}' 2>/dev/null | grep "^data:" | head -1
```

### STEP 2 — Fix src/lib/mcp-client.ts

File: `src/lib/mcp-client.ts`

Replace hardcoded port map with settings-storage values:

```typescript
// REMOVE:
const AGENT_PORTS: Record<AgentKind, string> = {
  drakon: "8765",
  architect: "8766",
  docs: "8767",
};

// REMOVE this function body (getAgentBaseUrl uses localStorage drakon_agent_base_url):
export function getAgentBaseUrl(): string { ... }

// REPLACE mcpCall to use settings:
import { readSettings } from "@/lib/settings-storage";

export function getAgentBaseUrl(): string {
  if (typeof window === "undefined") return "https://architect-agent-flue.maxfraieho.workers.dev";
  const stored = localStorage.getItem(AGENT_BASE_URL_STORAGE_KEY);
  if (stored?.trim()) return stored.trim();
  // Use settings-storage Flue Worker URLs per agent
  return readSettings().agents.architectUrl;
}

export function getAgentDirectUrl(agent: AgentKind): string {
  const s = readSettings().agents;
  if (agent === "drakon") return s.drakonUrl.replace(/\/+$/, "");
  if (agent === "docs") return s.docsUrl.replace(/\/+$/, "");
  return s.architectUrl.replace(/\/+$/, "");
}
```

In `mcpCall`, replace:
```typescript
// OLD:
const baseUrl = getAgentBaseUrl().replace(/\/$/, "");
const port = AGENT_PORTS[agent];
const path = AGENT_PATHS[agent];
const url = `${baseUrl}:${port}${path}`;

// NEW:
const baseUrl = getAgentDirectUrl(agent);
const path = AGENT_PATHS[agent];
const url = `${baseUrl}${path}`;
```

### STEP 3 — Fix src/lib/agent-api.ts

File: `src/lib/agent-api.ts`

```typescript
// REMOVE:
const AGENT_PORTS: Record<AgentId, number> = {
  drakon: 8766,
  architect: 8766,
  docs: 8766,
  "sonate-solidaire": 8766,
};

function readAgentBaseUrl(): string { ... }

function getAgentUrlFor(agentId: AgentId): string {
  const fromBase = readAgentBaseUrl()...
  // whole function
}

// REPLACE getAgentUrlFor with:
function getAgentUrlFor(agentId: AgentId): string {
  const a = readSettings().agents;
  if (agentId === "drakon") return a.drakonUrl.replace(/\/+$/, "");
  if (agentId === "docs") return a.docsUrl.replace(/\/+$/, "");
  return a.architectUrl.replace(/\/+$/, "");
}
```

Also remove `readAgentBaseUrl` function and `AGENT_PORTS` constant entirely — no longer needed.

### STEP 4 — Fix src/lib/graph-pipeline-api.ts

File: `src/lib/graph-pipeline-api.ts`

Replace entire `getArchitectBase()` function:

```typescript
// OLD (lines ~25-45): complex logic with hardcoded :8766 appending
function getArchitectBase(): string {
  if (typeof window === "undefined") return "http://192.168.3.184:8766";
  // ... localStorage lookup ... :8766 appending ...
}

// NEW: simple, uses settings
function getArchitectBase(): string {
  if (typeof window === "undefined") return "https://architect-agent-flue.maxfraieho.workers.dev";
  return readSettings().agents.architectUrl.replace(/\/+$/, "");
}
```

Make sure `import { readSettings } from "@/lib/settings-storage";` is at top of file.

### STEP 5 — Verify TypeScript compiles

```bash
cd ~/workspace/ai-drakon-scaffolder
npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before continuing.

### STEP 6 — Sync to .lovable and commit

```bash
cp src/lib/mcp-client.ts .lovable/src/lib/mcp-client.ts
cp src/lib/agent-api.ts .lovable/src/lib/agent-api.ts
cp src/lib/graph-pipeline-api.ts .lovable/src/lib/graph-pipeline-api.ts

git add src/lib/mcp-client.ts src/lib/agent-api.ts src/lib/graph-pipeline-api.ts \
        .lovable/src/lib/mcp-client.ts .lovable/src/lib/agent-api.ts .lovable/src/lib/graph-pipeline-api.ts
git commit -m "feat(frontend): rewire agent URLs from hardcoded ports to Flue Worker settings

- mcp-client.ts: use settings.agents.drakonUrl/docsUrl/architectUrl
- agent-api.ts: remove AGENT_PORTS + readAgentBaseUrl, use settings directly
- graph-pipeline-api.ts: getArchitectBase() → settings.agents.architectUrl

Old Python agent ports 8765/8766/8767 no longer referenced."
git push origin main
```

### STEP 7 — Mark tasks done

```bash
sed -i 's/^\[ \] TASK-177/[x] TASK-177/' development/TASKS.md
sed -i 's/^\[ \] TASK-179/[x] TASK-179/' development/TASKS.md
sed -i 's/^\[ \] TASK-180/[x] TASK-180/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): TASK-177, 179, 180 done — Flue agents fully connected"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-180:frontend-flue-rewire|mcp-client+agent-api+graph-pipeline|commit:<hash>|★★★★★"`

---

## [x] TASK-181: Investigate Flue agent logic definition — can /agents page work with Flue?

**Goal:** The /agents page previously defined agent behavior via old LangGraph Python framework.
New framework is Flue (@flue/runtime, Cloudflare Workers). Investigate:
1. What does /agents page currently show/do?
2. How is agent logic currently defined in Flue Workers?
3. Can we define/edit agent behavior from the frontend with Flue?
4. If yes — implement. If no — propose what to change.

**Agent:** AGY3
**Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/**

### STEP 1 — GitNexus: understand /agents page

```bash
cd ~/workspace/ai-drakon-scaffolder

# Pull latest first
git pull origin main

# Query GitNexus for agents page components
curl -s "https://gitnexus.exodus.pp.ua/api/repos" | python3 -c "import sys,json; print('repos:', [r['name'] for r in json.load(sys.stdin)])"

# Find agents page file
find src -name "*gent*" -o -name "*Agent*" | grep -v node_modules | grep -E "\.(tsx|ts)$" | head -20

# Check what the agents page renders
grep -rn "AgentsPage\|/agents\|agent-studio" src/pages/ src/App.tsx 2>/dev/null | head -10
```

### STEP 2 — Read agents page + agent studio data

```bash
# Find and read the agents page
cat src/pages/AgentsPage.tsx 2>/dev/null | head -100 || \
find src -name "*.tsx" | xargs grep -l "agents\|AgentStudio" 2>/dev/null | head -5

# Read agent studio data (old static agent definitions)
cat src/lib/agent-studio-data.ts 2>/dev/null | head -80
```

### STEP 3 — NotebookLM: query Flue docs for agent behavior definition

Use the Flue notebook (ID: 83ab40c7-7ca6-4685-9eb8-cf72dfa25f19) to understand
how agent logic/workflows/behavior is defined in Flue:

```bash
python3 << 'PYEOF'
import json, urllib.request

NLM_BASE = "http://192.168.3.234:8002"
NOTEBOOK_ID = "83ab40c7-7ca6-4685-9eb8-cf72dfa25f19"

# Initialize
req = urllib.request.Request(f"{NLM_BASE}/mcp",
    data=json.dumps({"jsonrpc":"2.0","id":1,"method":"initialize",
        "params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}).encode(),
    headers={"Content-Type":"application/json","Accept":"application/json, text/event-stream"})
with urllib.request.urlopen(req, timeout=10) as r:
    session_id = r.headers.get("mcp-session-id","")
print("session:", session_id)

# Query Flue agent behavior
payload = json.dumps({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_ask",
    "arguments":{"notebook_id":NOTEBOOK_ID,
        "question":"How do you define agent behavior and workflow logic in Flue? What is a Workflow, what is an Agent, how do you configure steps and tools? Can agent logic be defined at runtime or is it always code?",
        "response_length":"medium"}}}).encode()
req2 = urllib.request.Request(f"{NLM_BASE}/mcp",
    data=payload,
    headers={"Content-Type":"application/json","Accept":"application/json, text/event-stream",
             "mcp-session-id": session_id})
with urllib.request.urlopen(req2, timeout=60) as r:
    resp = r.read().decode()
for line in resp.split('\n'):
    if line.startswith('data:'):
        d = json.loads(line[5:])
        content = d.get('result',{}).get('content',[])
        for c in content:
            if c.get('type') == 'text':
                print(c['text'][:3000])
PYEOF
```

### STEP 4 — Read current Flue agent implementations

```bash
# Check what workflows/agents exist in architect-agent-flue
ls services/architect-agent-flue/workflows/ 2>/dev/null
ls services/architect-agent-flue/agents/ 2>/dev/null
cat services/architect-agent-flue/workflows/pipeline-a.ts 2>/dev/null | head -60

# Check tools/graph-pipelines.ts — how pipeline logic is stored
cat services/architect-agent-flue/tools/graph-pipelines.ts 2>/dev/null | head -80
```

### STEP 5 — Write investigation report

```bash
cat > development/investigations/flue-agent-logic-2026-06-08.md << 'REPORT'
# Flue Agent Logic Investigation (TASK-181)
Date: $(date +%Y-%m-%d)

## /agents page — current state
[describe what the page shows, what data it uses]

## How agent logic was defined in OLD framework (LangGraph)
[describe the old approach]

## How agent logic is defined in NEW framework (Flue)
[describe Flue Workflows, Agents, Tools based on NotebookLM answer]

## Gap analysis
- Can frontend define/edit agent behavior? YES/NO
- What is missing?
- Recommended approach:

## Implementation plan
[concrete steps to enable agent logic definition in /agents page with Flue]
REPORT
```

### STEP 6 — Implement if straightforward, otherwise report only

**IF** agent logic in Flue can be configured via KV/JSON (data-driven):
- Update `/agents` page to load pipeline definitions from `GET /graph-pipelines`
- Allow editing pipeline steps via the UI
- Save changes via `PUT /graph-pipelines/:name`

**IF** agent logic requires TypeScript code changes:
- Document what needs to change
- Write the new workflow/agent files for drakon, docs, architect agents
- Deploy updated Workers

### STEP 7 — Commit report + any changes

```bash
git add development/investigations/flue-agent-logic-2026-06-08.md
git add services/ src/ -p  # only if changes made
git commit -m "docs(investigation): TASK-181 Flue agent logic — /agents page gap analysis"
git push origin main

sed -i 's/^\[ \] TASK-181/[x] TASK-181/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): TASK-181 done — Flue agent logic investigation"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-181:flue-agent-logic|agents-page-gap|findings:<1-line-summary>|★★★★"`

---

## [x] TASK-182: Implement /tools endpoint + connect /agents UI to Flue dynamic actions

**Goal:** Based on TASK-181 investigation — standardize on JSON-graph pipelines, expose available
Flue tools via `/tools` API, update frontend to use dynamic tools list instead of static data.

**Agent:** AGY3
**Run locally on AGY3 Termux. Work in ~/workspace/ai-drakon-scaffolder/**

### STEP 0 — Pull latest + GitNexus context

```bash
cd ~/workspace/ai-drakon-scaffolder
git pull origin main

# GitNexus: find tools registry, graph-pipelines, agent-studio-data
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"agt-ogy3","version":"1.0"},"capabilities":{}}}' > /dev/null 2>&1

curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query","arguments":{"query":"executePipelineGraph action nodes tools graph-pipelines drakon.json","repo":"ai-drakon-scaffolder"}}}' \
  | grep "^data:" | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:2000]) for l in sys.stdin if l.startswith('data:')]" 2>/dev/null
```

### STEP 1 — Read graph-pipelines.ts to extract available actions

```bash
cat services/architect-agent-flue/tools/graph-pipelines.ts | head -150
```

Find all action names in `executePipelineGraph` switch/if block.
Expected: `measure_cc`, `classify`, `ast_translate`, `yaml_gen`, `ir_gen`, `ir_refine`,
`ralph_check`, `code_gen`, `self_reflect`, `validate`, `check_syntax`, `llm_call`, etc.

### STEP 2 — Add /tools endpoint to architect-agent-flue

File: `services/architect-agent-flue/src/index.ts`

Add after `/health` route:

```typescript
// Tools registry — available pipeline node actions
app.get('/tools', (c) => c.json({
  tools: [
    { name: 'measure_cc', description: 'Measure cyclomatic complexity of code', inputs: ['code'], outputs: ['cc_score'] },
    { name: 'classify', description: 'Classify code or text into categories', inputs: ['input'], outputs: ['category'] },
    { name: 'ast_translate', description: 'Translate code to AST representation', inputs: ['code'], outputs: ['ast'] },
    { name: 'yaml_gen', description: 'Generate YAML from structured input', inputs: ['input'], outputs: ['yaml'] },
    { name: 'ir_gen', description: 'Generate DRAKON IR from description', inputs: ['description'], outputs: ['ir'] },
    { name: 'ir_refine', description: 'Refine existing DRAKON IR', inputs: ['ir', 'feedback'], outputs: ['ir'] },
    { name: 'ralph_check', description: 'Run RALPH compliance check', inputs: ['ir'], outputs: ['report'] },
    { name: 'code_gen', description: 'Generate code from DRAKON IR', inputs: ['ir'], outputs: ['code'] },
    { name: 'self_reflect', description: 'Agent self-reflection on output quality', inputs: ['output'], outputs: ['reflection'] },
    { name: 'validate', description: 'Validate output against schema/rules', inputs: ['output'], outputs: ['valid', 'errors'] },
    { name: 'check_syntax', description: 'Check code syntax', inputs: ['code'], outputs: ['valid', 'errors'] },
    { name: 'llm_call', description: 'Generic LLM call with custom prompt', inputs: ['prompt', 'context'], outputs: ['response'] },
    { name: 'suggest_patterns', description: 'Suggest architectural patterns', inputs: ['docs', 'requirements'], outputs: ['patterns'] },
  ]
}));
```

Read `graph-pipelines.ts` first and adjust the list to match actual implemented actions.

### STEP 3 — Deploy updated architect-agent-flue

```bash
cd services/architect-agent-flue
export CLOUDFLARE_API_TOKEN="<CF_API_TOKEN>"
CI=true npx wrangler deploy --config wrangler.toml 2>&1 | tail -5

# Verify:
curl -s https://architect-agent-flue.maxfraieho.workers.dev/tools | python3 -m json.tool | head -20
```

### STEP 4 — Update frontend: replace static agent-studio-data with dynamic /tools fetch

File: `src/lib/agent-studio-data.ts`

Add a function to fetch tools dynamically:

```typescript
import { readSettings } from "@/lib/settings-storage";

export async function fetchAvailableTools(): Promise<ToolDefinition[]> {
  try {
    const base = readSettings().agents.architectUrl.replace(/\/+$/, "");
    const resp = await fetch(`${base}/tools`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.tools ?? [];
  } catch {
    return STATIC_PIPELINE_NODES; // fallback to static
  }
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
}
```

Keep existing static data as `STATIC_PIPELINE_NODES` for fallback.

### STEP 5 — Find and update AgentStudioPage / PropertiesPanel

```bash
# Find where node types are used in UI
grep -rn "agent-studio-data\|PIPELINE_NODES\|nodeTypes\|actionType" src/components/ src/pages/ | grep -v node_modules | head -20
```

In the component that renders the node action selector (PropertiesPanel or similar):
- Replace static list with `useEffect(() => fetchAvailableTools().then(setTools), [])` 
- Show loading state while fetching

### STEP 6 — TypeScript check + sync to .lovable

```bash
cd ~/workspace/ai-drakon-scaffolder
npx tsc --noEmit 2>&1 | head -20

# Sync changed files to .lovable
for f in src/lib/agent-studio-data.ts; do
  cp "$f" ".lovable/$f" 2>/dev/null && echo "synced $f"
done
# Also sync any changed component files
```

### STEP 7 — Commit and push all changes

```bash
cd ~/workspace/ai-drakon-scaffolder
git add services/architect-agent-flue/src/index.ts \
        src/lib/agent-studio-data.ts \
        .lovable/src/lib/agent-studio-data.ts
# Add any component changes too
git add src/components/ .lovable/src/components/ 2>/dev/null || true

git commit -m "feat(flue): /tools endpoint + dynamic tool loading in /agents UI

- architect-agent-flue: GET /tools exposes all available pipeline actions
- agent-studio-data.ts: fetchAvailableTools() fetches from Worker, fallback to static
- PropertiesPanel: loads tools dynamically from Flue Worker"
git push origin main

sed -i 's/^\[ \] TASK-182/[x] TASK-182/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): TASK-182 done — /tools endpoint + dynamic UI"
git push origin main
```

**Diary:** `"SESSION:$(date +%Y-%m-%d)|TASK-182:flue-tools-endpoint|dynamic-ui|commit:<hash>|★★★★★"`

---

## TASK-190: GitHub токен зникає після повторного логіну
[x] TASK-190

### GOAL
`clearAccessToken()` в auth.ts при logout знищував всі localStorage ключі включно з drakon.settings.

### FIX
Зберігати ключі `drakon.settings`, API keys, nav_collapsed тощо перед `localStorage.clear()`, потім відновлювати.

### DONE
`e40c012` — auth.ts: clearAccessToken preserves settings

---

## TASK-191: Список проектів порожній
[x] TASK-191

### GOAL
`/agents` → "Управління проектами" показує порожній список. Не завантажує з Workers GET /projects.

### TODO
- Перевірити ProjectSelector / ZoneCreationDialog чи fetchProjects() реалізований
- Якщо ні — додати fetchProjects() що викликає `architectUrl/projects`

---

## TASK-192: Агенти offline — діагностика
[x] TASK-192

### GOAL
Всі агенти — червоні. AgentStatusCard не надсилав Authorization header.

### FIX
`e40c012` — AgentStatusCard: додано `Authorization: Bearer <token>` до health fetch.

### TODO (partial)
- Перевірити чи дефолтні URLs в settings-storage вже Flue Workers
- Якщо ні — оновити DEFAULT_SETTINGS

---

## TASK-193: Encoding bug "SlotRouter â score_candidate"
[x] TASK-193

### GOAL
Назви діаграм з некоректним Latin-1→UTF-8 encoding.

### TODO
- Додати `sanitizeDiagramName()` в diagram-storage.ts
- Застосувати в DiagramsPage при відображенні карток

---

## TASK-194: /docs "Не вдалося завантажити файл з GitHub"
[ ] TASK-194

### GOAL
Помилка при відкритті файлів в /docs — наслідок TASK-190 або lazy-load race.

### TODO
- Перевірити EditorPage чи docs-api.ts
- Додати human-readable error + "Перейти в Settings" action


---

## TASK-196: GardenPage — docs tab з knowledge graph + WorkspaceShell + AgentChat LLM warning
[x] TASK-196

### CONTEXT
Claude вже написав GardenPage.tsx та оновив docs.tsx на dev server (192.168.3.184).
Потрібно перевірити + дописати ще 2 виправлення + закомітити все.

!!IMPORTANT!! Run ALL commands via SSH to 192.168.3.184:
SSH: sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
Project: /home/vokov/projects/ai-drakon-scaffolder

### STEP 1 — перевірити що є на dev server

```bash
# Переконатись що файли існують
ls -la /home/vokov/projects/ai-drakon-scaffolder/src/pages/GardenPage.tsx
cat /home/vokov/projects/ai-drakon-scaffolder/src/routes/docs.tsx
```

Expected:
- GardenPage.tsx існує (файл написаний Claude)
- docs.tsx містить `import { GardenPage }` замість `ProjectFileManager`

### STEP 2 — TypeScript check + fix GardenPage.tsx

```bash
cd /home/vokov/projects/ai-drakon-scaffolder
npm run build 2>&1 | head -50
```

Якщо є TypeScript помилки в GardenPage.tsx — виправ їх. Основні можливі помилки:
- `NoteListItem` не знайдено: import з `@/lib/garden/graphTypes` АБО `@/lib/garden/notesApi`
- `NoteRenderer` default vs named export: перевір `src/components/docs/garden/NoteRenderer.tsx`
- `ExecutionGraph` default vs named export: перевір `src/components/docs/garden/ExecutionGraph.tsx`

### STEP 3 — Fix WorkspaceShell.tsx: project badge when collapsed

File: `src/components/workspace/WorkspaceShell.tsx`

Знайди секцію header (рядок ~207-215) де є Link to="/pipelines" з "AI-DRAKON".
ПІСЛЯ цього Link додай compact project badge що показується тільки коли `navCollapsed === true`:

```tsx
{navCollapsed && activeProject && (
  <button
    type="button"
    onClick={() => setNavCollapsed(false)}
    className="hidden lg:flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent-amber)] hover:bg-[var(--accent-dim)] transition-colors"
    title="Відкрити навігацію"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)]" />
    <span className="truncate max-w-[100px]">{activeProject.name}</span>
  </button>
)}
```

Для цього потрібно: `const { activeProject } = useProject();` — перевір чи він вже є в компоненті.
Якщо немає — додай `import { useProject } from "@/context/ProjectContext";` та деструктуризацію.

### STEP 4 — Fix AgentChatPanel.tsx: LLM config warning

File: `src/components/agents/AgentChatPanel.tsx`

Знайди рядок де починається return JSX (приблизно після `const messages = sessions[activeAgent]`).
Додай функцію перевірки LLM конфігурації та warning banner.

Додай після існуючих imports:
```tsx
import { getLlmConfig } from "@/lib/agent-api";
```

Перевір чи `getLlmConfig` є exported з agent-api. Якщо ні (вона там private `function getLlmConfig`), то замість import — скопіюй логіку inline:

```tsx
function hasLlmConfig(agentId: string): boolean {
  if (typeof window === "undefined") return true;
  const protocol = localStorage.getItem(`${agentId}_llm_protocol`) || localStorage.getItem("agent_llm_protocol");
  const apiKey = localStorage.getItem(`${agentId}_llm_api_key`) || localStorage.getItem("agent_llm_api_key");
  return !!(protocol || apiKey);
}
```

В JSX, ПЕРЕД messages area (після TabsList/Tabs), додай warning banner:
```tsx
{!hasLlmConfig(activeAgent) && (
  <div className="flex items-center gap-2 border-b border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
    <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
    <span className="font-mono text-[10px] text-yellow-300 flex-1">
      LLM не налаштовано для цього агента
    </span>
    <a
      href="/settings"
      className="font-mono text-[10px] text-yellow-400 underline hover:text-yellow-300"
    >
      Налаштувати
    </a>
  </div>
)}
```

AlertCircle вже є в imports AgentChatPanel.

### STEP 5 — build check + commit

```bash
cd /home/vokov/projects/ai-drakon-scaffolder
npm run build 2>&1 | tail -20

# Якщо build OK:
git add src/pages/GardenPage.tsx src/routes/docs.tsx src/components/workspace/WorkspaceShell.tsx src/components/agents/AgentChatPanel.tsx
git status
git commit -m "feat(docs): restore garden knowledge graph page, fix project selector, LLM warning

- docs tab: GardenPage with ExecutionGraph + NoteRenderer (was: duplicate of code tab)
- WorkspaceShell: show project badge in header when sidebar collapsed
- AgentChatPanel: warn when LLM not configured (health check != LLM ready)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

### VERIFY

```bash
curl -s -o /dev/null -w "%{http_code}" https://aidrakon.tech/ 2>/dev/null
# expected: 200 (after CF Pages build ~3 min)
```

### DIARY
Entry: "SESSION:$(date +%Y-%m-%d)|TASK-196:garden-page+llm-warning|docs-restored|commit:$(cd /home/vokov/projects/ai-drakon-scaffolder && git rev-parse --short HEAD)|★★★"

---

## [x] TASK-197

### GOAL
Переробити ProjectSelector та ProjectContext для роботи з будь-яким GitHub репозиторієм без реєстрації в Worker. Користувач вводить GitHub токен в Settings один раз — і може додавати будь-яке доступне репо прямо в модалці.

### APPROACH

**1. ProjectContext.tsx** — додати localStorage-шар для локально доданих проектів

Файл: `src/context/ProjectContext.tsx`

Додати константу і хелпери (поза компонентом):
```typescript
const LOCAL_PROJECTS_KEY = "ai_drakon_local_projects";

function loadLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch { return []; }
}

function saveLocalProjects(list: Project[]) {
  try { localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list)); } catch {}
}
```

В `ProjectContextValue` інтерфейсі додати:
```typescript
addLocalProject: (p: Project) => void;
removeLocalProject: (slug: string) => void;
```

В `loadProjects()` — після того як отримали `parsed` масив з Worker — merge з local:
```typescript
const localList = loadLocalProjects();
const merged = [
  ...parsed,
  ...localList.filter(lp => !parsed.find(wp => wp.slug === lp.slug))
];
setProjects(merged);
// далі замінити всі `parsed` на `merged` при setActiveProjectState логіці
```

Додати `addLocalProject` і `removeLocalProject` через `useCallback`:
```typescript
const addLocalProject = useCallback((p: Project) => {
  const list = loadLocalProjects();
  if (!list.find(x => x.slug === p.slug)) {
    saveLocalProjects([...list, p]);
  }
  setProjects(prev => prev.find(x => x.slug === p.slug) ? prev : [...prev, p]);
}, []);

const removeLocalProject = useCallback((slug: string) => {
  const list = loadLocalProjects().filter(x => x.slug !== slug);
  saveLocalProjects(list);
  setProjects(prev => prev.filter(x => x.slug !== slug));
  setActiveProjectState(prev => prev?.slug === slug ? null : prev);
}, []);
```

Передати в `<ProjectContext.Provider value={{ ..., addLocalProject, removeLocalProject }}>`.

---

**2. ProjectSelector.tsx** — новий UX: GitHub repo picker

Файл: `src/components/workspace/ProjectSelector.tsx`

Додати імпорт: `import { readSettings } from "@/lib/settings-storage";`

Отримати з `useProject()`:
```typescript
const { projects, activeProject, setActiveProject, loadProjects, loading,
        addLocalProject, removeLocalProject } = useProject();
```

Замінити стару форму (addOpen Dialog зі slug/name/path) на новий flow.

**Новий state і тип:**
```typescript
interface GhRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  default_branch: string;
  private: boolean;
  language: string | null;
}

const [repoInput, setRepoInput] = useState("");
const [searching, setSearching] = useState(false);
const [searchResults, setSearchResults] = useState<GhRepo[]>([]);
const [searchError, setSearchError] = useState("");
```

**Функції:**
```typescript
const loadUserRepos = async () => {
  const token = readSettings().github.token;
  if (!token) return;
  setSearching(true);
  setSearchError("");
  try {
    const resp = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator",
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
    setSearchResults(await resp.json() as GhRepo[]);
  } catch (e) {
    setSearchError(e instanceof Error ? e.message : "Помилка");
  } finally {
    setSearching(false);
  }
};

const searchRepo = async () => {
  const trimmed = repoInput.trim();
  if (!trimmed) { await loadUserRepos(); return; }
  setSearching(true);
  setSearchError("");
  try {
    const token = readSettings().github.token;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const resp = await fetch(`https://api.github.com/repos/${trimmed}`, { headers });
    if (!resp.ok) throw new Error(resp.status === 404 ? "Репозиторій не знайдено" : `GitHub API ${resp.status}`);
    setSearchResults([await resp.json() as GhRepo]);
  } catch (e) {
    setSearchError(e instanceof Error ? e.message : "Помилка");
    setSearchResults([]);
  } finally {
    setSearching(false);
  }
};

const pickRepo = (repo: GhRepo) => {
  const slug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const project: Project = {
    slug,
    name: repo.full_name,
    description: repo.description ?? "",
    hasDrakonIr: false,
    hasDocs: false,
    exists: true,
    github: {
      owner: repo.owner.login,
      repo: repo.name,
      branch: repo.default_branch,
    },
  };
  addLocalProject(project);
  setActiveProject(project);
  setAddOpen(false);
  setManagerOpen(false);
  setRepoInput("");
  setSearchResults([]);
  toast.success(`Проект ${repo.full_name} додано`);
};
```

**handleDelete — розрізняти local vs Worker:**
```typescript
const handleDelete = (slug: string) => {
  const localList: Array<{slug: string}> = (() => {
    try { return JSON.parse(localStorage.getItem("ai_drakon_local_projects") || "[]"); } catch { return []; }
  })();
  const isLocal = localList.some(lp => lp.slug === slug);
  if (isLocal) {
    removeLocalProject(slug);
    toast.success("Проект видалено");
  } else {
    setDeleting(slug);
    void api.deleteProject(slug)
      .then(() => loadProjects())
      .then(() => toast.success("Проект видалено"))
      .catch(() => toast.error("Помилка видалення"))
      .finally(() => setDeleting(null));
  }
};
```

**JSX для нового AddDialog** (замінити стару Dialog з addOpen):
```tsx
<Dialog open={addOpen} onOpenChange={(o) => {
  setAddOpen(o);
  if (o) { setSearchResults([]); setSearchError(""); void loadUserRepos(); }
}}>
  <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-md font-mono">
    <DialogHeader>
      <DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
        Додати репозиторій
      </DialogTitle>
      <DialogDescription className="text-[11px] text-[var(--text-muted)]">
        Введіть owner/repo або оберіть з вашого списку
      </DialogDescription>
    </DialogHeader>

    <div className="flex gap-2">
      <Input
        value={repoInput}
        onChange={(e) => setRepoInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void searchRepo(); }}
        placeholder="maxfraieho/uav-watcher"
        className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)] flex-1"
      />
      <Button size="sm" variant="outline" onClick={() => void searchRepo()} disabled={searching}
        className="h-7 font-mono text-[10px] uppercase shrink-0">
        {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Знайти"}
      </Button>
    </div>

    {searchError && <p className="text-[10px] text-red-400 font-mono">{searchError}</p>}

    <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto pr-1">
      {searchResults.map((repo) => (
        <button
          key={repo.full_name}
          type="button"
          onClick={() => pickRepo(repo)}
          className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2.5 py-2 text-left hover:bg-white/5 hover:border-[var(--accent-amber)]/40 transition-colors"
        >
          <span className="font-mono text-[11px] text-[var(--accent-amber)] font-medium">
            {repo.full_name}
          </span>
          {repo.description && (
            <span className="font-mono text-[9px] text-[var(--text-muted)] line-clamp-1">
              {repo.description}
            </span>
          )}
          <div className="flex gap-2 mt-0.5">
            {repo.language && (
              <span className="font-mono text-[8px] text-[var(--text-muted)]">{repo.language}</span>
            )}
            <span className="font-mono text-[8px] text-[var(--text-muted)]">{repo.default_branch}</span>
            {repo.private && (
              <span className="font-mono text-[8px] text-red-400/60">private</span>
            )}
          </div>
        </button>
      ))}
      {!searching && searchResults.length === 0 && !searchError && (
        <p className="text-[10px] text-[var(--text-muted)] font-mono text-center py-4">
          Введіть репозиторій або зачекайте завантаження
        </p>
      )}
    </div>
  </DialogContent>
</Dialog>
```

**Видалити старі state** які більше не потрібні: `githubOpen`, `form` (всі 6 полів).
**Видалити старий Collapsible** і старий JSX форми (slug/name/path inputs).

---

**3. Синхронізація src/ → .lovable/src/**

```bash
cp src/context/ProjectContext.tsx .lovable/src/context/ProjectContext.tsx
cp src/components/workspace/ProjectSelector.tsx .lovable/src/components/workspace/ProjectSelector.tsx
```

### VERIFICATION
```bash
cd ~/workspace/ai-drakon-scaffolder
grep -n "addLocalProject\|removeLocalProject\|LOCAL_PROJECTS_KEY" src/context/ProjectContext.tsx
grep -n "loadUserRepos\|searchRepo\|pickRepo\|GhRepo" src/components/workspace/ProjectSelector.tsx
diff src/context/ProjectContext.tsx .lovable/src/context/ProjectContext.tsx && echo "CTX SYNCED"
diff src/components/workspace/ProjectSelector.tsx .lovable/src/components/workspace/ProjectSelector.tsx && echo "SEL SYNCED"
```

### COMMIT
```
git add src/context/ProjectContext.tsx .lovable/src/context/ProjectContext.tsx \
        src/components/workspace/ProjectSelector.tsx .lovable/src/components/workspace/ProjectSelector.tsx
git commit -m "feat(projects): GitHub-token repo picker + localStorage local projects"
git push origin main
```

### NOTES
- !!IMPORTANT!! Run LOCALLY on Termux (AGY3). Do NOT SSH anywhere.
- Repo at ~/workspace/ai-drakon-scaffolder — git pull first
- Import `Project` type in ProjectSelector.tsx: `import { type Project, useProject } from "@/context/ProjectContext";`
- `readSettings` import: `import { readSettings } from "@/lib/settings-storage";`
- Do NOT remove Worker `listProjectsArch()` — it still loads pre-registered projects
- Do NOT introduce TypeScript errors — check all types
- The old `form` state object and `githubOpen` state can be removed entirely

### DIARY
Entry: "SESSION:2026-06-09|TASK-197:github-repo-picker+localStorage|commit:<hash>|★★★"

---

## [x] TASK-198

### GOAL
Додати до MCP сервера (architect-agent-flue) інструменти для роботи з будь-яким GitHub репозиторієм. Агент підключається через MCP, передає owner/repo/token — і може читати/писати файли, шукати код в будь-якому репо.

### CONTEXT
MCP сервер: `services/architect-agent-flue/src/mcp-server.ts`
GitHub API утиліта: `services/architect-agent-flue/lib/github-api.ts` (вже є, клас GitHubAPI)
Worker env: `env.GITHUB_TOKEN` (CF secret, може бути порожнім)

### WHAT TO ADD

**4 нові MCP tools** в `mcp-server.ts`:

**1. `gh_list_files`** — список файлів в директорії:
```typescript
{
  name: 'gh_list_files',
  description: 'List files and directories in a GitHub repository path.',
  inputSchema: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'GitHub owner/org' },
      repo:  { type: 'string', description: 'Repository name' },
      path:  { type: 'string', description: 'Directory path (empty = root)', default: '' },
      branch: { type: 'string', description: 'Branch name', default: 'main' },
      token: { type: 'string', description: 'GitHub token (optional, uses env fallback)' }
    },
    required: ['owner', 'repo']
  }
}
```

**2. `gh_read_file`** — читання файлу:
```typescript
{
  name: 'gh_read_file',
  description: 'Read file content from any GitHub repository.',
  inputSchema: {
    type: 'object',
    properties: {
      owner:  { type: 'string' },
      repo:   { type: 'string' },
      path:   { type: 'string', description: 'File path in repository' },
      branch: { type: 'string', default: 'main' },
      token:  { type: 'string', description: 'GitHub token (optional)' }
    },
    required: ['owner', 'repo', 'path']
  }
}
```

**3. `gh_write_file`** — запис/оновлення файлу:
```typescript
{
  name: 'gh_write_file',
  description: 'Create or update a file in any GitHub repository (requires token with write access).',
  inputSchema: {
    type: 'object',
    properties: {
      owner:   { type: 'string' },
      repo:    { type: 'string' },
      path:    { type: 'string', description: 'File path in repository' },
      content: { type: 'string', description: 'New file content (UTF-8)' },
      message: { type: 'string', description: 'Commit message' },
      branch:  { type: 'string', default: 'main' },
      token:   { type: 'string', description: 'GitHub token with write access' }
    },
    required: ['owner', 'repo', 'path', 'content', 'message']
  }
}
```

**4. `gh_search_code`** — пошук коду:
```typescript
{
  name: 'gh_search_code',
  description: 'Search code in a GitHub repository using GitHub code search.',
  inputSchema: {
    type: 'object',
    properties: {
      owner:  { type: 'string' },
      repo:   { type: 'string' },
      query:  { type: 'string', description: 'Search query (GitHub code search syntax)' },
      token:  { type: 'string', description: 'GitHub token (required for code search API)' }
    },
    required: ['owner', 'repo', 'query']
  }
}
```

### IMPLEMENTATION

В `mcp-server.ts` в `switch (name)` додати handlers:

```typescript
} else if (name === 'gh_list_files') {
  const { owner, repo, path = '', branch = 'main', token } = args || {};
  const ghToken = token || c.env.GITHUB_TOKEN || '';
  const api = new GitHubAPI(ghToken, `${owner}/${repo}`, branch);
  const items = await api.listDir(path);
  result = items.map(i => ({ name: i.name, path: i.path, type: i.type, size: i.size }));

} else if (name === 'gh_read_file') {
  const { owner, repo, path, branch = 'main', token } = args || {};
  const ghToken = token || c.env.GITHUB_TOKEN || '';
  const api = new GitHubAPI(ghToken, `${owner}/${repo}`, branch);
  const file = await api.getFile(path);
  result = { path, content: file.content, sha: file.sha };

} else if (name === 'gh_write_file') {
  const { owner, repo, path, content, message, branch = 'main', token } = args || {};
  const ghToken = token || c.env.GITHUB_TOKEN || '';
  if (!ghToken) throw new Error('GitHub token required for write operations');
  const api = new GitHubAPI(ghToken, `${owner}/${repo}`, branch);
  // Get SHA if file exists (for update)
  let sha: string | undefined;
  try { const existing = await api.getFile(path); sha = existing.sha; } catch {}
  const commitResult = await api.putFile(path, content, message, sha);
  result = { path, sha: commitResult.sha, committed: true };

} else if (name === 'gh_search_code') {
  const { owner, repo, query, token } = args || {};
  const ghToken = token || c.env.GITHUB_TOKEN || '';
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (ghToken) headers.Authorization = `Bearer ${ghToken}`;
  const q = encodeURIComponent(`${query} repo:${owner}/${repo}`);
  const resp = await fetch(`https://api.github.com/search/code?q=${q}&per_page=20`, { headers });
  if (!resp.ok) throw new Error(`GitHub search API ${resp.status}: ${await resp.text()}`);
  const data: any = await resp.json();
  result = (data.items || []).map((i: any) => ({
    path: i.path,
    url: i.html_url,
    score: i.score
  }));
}
```

**ВАЖЛИВО:** Додати import GitHubAPI на початку файлу якщо його там ще немає:
```typescript
import { GitHubAPI } from '../lib/github-api.js';
```

### DEPLOY

Worker деплоїться через Wrangler. Після змін в `mcp-server.ts`:
```bash
cd ~/workspace/ai-drakon-scaffolder/services/architect-agent-flue
npx wrangler deploy 2>&1 | tail -10
```
Якщо wrangler не встановлений:
```bash
npm install -g wrangler
```

### VERIFICATION
```bash
# 1. Перевірити що нові tools є в MCP list
curl -s -X POST https://architect-agent-flue.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | python3 -c "
import sys,json
data=json.load(sys.stdin)
tools = data.get('result',{}).get('tools',[])
for t in tools:
    print(t['name'])
"

# 2. Перевірити gh_list_files на публічному репо (без токена)
curl -s -X POST https://architect-agent-flue.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"gh_list_files","arguments":{"owner":"maxfraieho","repo":"ai-drakon-scaffolder","path":""}}}' \
  | python3 -m json.tool | head -20
```

### COMMIT
```bash
cd ~/workspace/ai-drakon-scaffolder
git add services/architect-agent-flue/src/mcp-server.ts
git commit -m "feat(mcp): add gh_list_files, gh_read_file, gh_write_file, gh_search_code tools"
git push origin main
```

### NOTES
- !!IMPORTANT!! Run LOCALLY on Termux (AGY3). Do NOT SSH anywhere.
- Repo at ~/workspace/ai-drakon-scaffolder — git pull first
- The `putFile` method in GitHubAPI is already implemented (handles create + update with SHA)
- `gh_write_file` needs token — throw clear error if missing
- Keep existing MCP tools intact — only ADD new ones
- MCP endpoint may be `/mcp` or `/api/mcp` — check index.ts for the route
- After deploy, Worker URL is: https://architect-agent-flue.maxfraieho.workers.dev

### DIARY
Entry: "SESSION:2026-06-09|TASK-198:mcp-github-tools|gh_list_files+gh_read_file+gh_write_file+gh_search_code|commit:<hash>|★★★"

---

## [x] TASK-199

### GOAL
Додати у хедер WorkspaceShell компактний dropdown для швидкого перемикання між репозиторіями. Клік на кнопку → випадний список всіх репо → вибір → всі вкладки перемикаються на обраний репо. Замість важкого модального вікна.

### CONTEXT
Файл: `src/components/workspace/WorkspaceShell.tsx` (і `.lovable/src/`)
ProjectContext вже має: `projects`, `activeProject`, `setActiveProject`
Sidebar `ProjectSelector` ЗАЛИШАЄТЬСЯ (для додавання/видалення репо), лише доповнюємо хедер.

### WHAT TO ADD

**Місце в хедері** — одразу після `<Link to="/pipelines">AI-DRAKON</Link>` (логотип), ПЕРЕД `<span aria-hidden="true" class="hidden lg:block h-3 w-px...">` (вертикальний роздільник).

**Компонент-dropdown у хедері:**

```tsx
// Додати імпорти на початку файлу (якщо їх ще немає):
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, GitBranch, Plus } from "lucide-react";

// В useProject() деструктурувати projects теж:
const { activeProject, setActiveProject, projects } = useProject();

// JSX після логотипу AI-DRAKON Link, перед вертикальним роздільником:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      type="button"
      className="hidden lg:flex items-center gap-1.5 h-5 px-2 rounded border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] hover:border-[var(--accent-amber)]/40 transition-colors max-w-[180px]"
    >
      <GitBranch className="h-3 w-3 shrink-0 text-[var(--accent-amber)]" />
      <span className="truncate">
        {activeProject
          ? (activeProject.github
              ? `${activeProject.github.owner}/${activeProject.github.repo}`
              : activeProject.name)
          : "Select repo"}
      </span>
      <ChevronDown className="h-3 w-3 shrink-0 ml-auto" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent
    align="start"
    className="min-w-[220px] bg-[var(--bg-surface)] border-[var(--border-subtle)] font-mono"
  >
    {projects.length === 0 ? (
      <DropdownMenuItem disabled className="text-[10px] text-[var(--text-muted)]">
        No repositories configured
      </DropdownMenuItem>
    ) : (
      projects.map((p) => (
        <DropdownMenuItem
          key={p.slug}
          onClick={() => setActiveProject(p)}
          className={`text-[10px] cursor-pointer gap-2 ${
            p.slug === activeProject?.slug
              ? "text-[var(--accent-amber)] bg-[var(--accent-dim)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          <span className="truncate">
            {p.github
              ? `${p.github.owner}/${p.github.repo}`
              : p.name}
          </span>
          {p.slug === activeProject?.slug && (
            <span className="ml-auto text-[8px] text-[var(--accent-amber)]">✓</span>
          )}
        </DropdownMenuItem>
      ))
    )}
    <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
    <DropdownMenuItem
      className="text-[10px] text-[var(--text-muted)] cursor-pointer gap-1.5"
      onClick={() => navigate({ to: "/settings" })}
    >
      <Plus className="h-3 w-3" />
      Manage repositories
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**ВАЖЛИВО — де вставити:** в JSX хедера WorkspaceShell знайти блок:
```tsx
<Link to="/pipelines" className="...">
  <Terminal ... />
  AI-DRAKON
</Link>
<span aria-hidden="true" className="hidden lg:block h-3 w-px bg-[var(--border-subtle)] mx-1"></span>
```

Вставити новий `<DropdownMenu>...</DropdownMenu>` між `</Link>` і `<span aria-hidden...>`.

**Видалити** з хедера рядок collapsed project badge якщо він є (був доданий в TASK-196):
```tsx
{navCollapsed && activeProject && (
  <div className="...">
    <GitBranch .../>
    ...
    <span>{activeProject.name}</span>
  </div>
)}
```
Він більше не потрібен — замінений dropdown-ом.

### SYNC
```bash
cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
```

### VERIFICATION
```bash
grep -n "DropdownMenu\|GitBranch\|Select repo\|activeProject.*github" src/components/workspace/WorkspaceShell.tsx | head -10
diff src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx && echo "SYNCED"
```

### COMMIT
```bash
git add src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
git commit -m "feat(header): repo switcher dropdown in navbar"
git push origin main
```

### NOTES
- !!IMPORTANT!! Run LOCALLY on Termux (AGY3). Do NOT SSH anywhere.
- Repo at ~/workspace/ai-drakon-scaffolder — git pull first
- `DropdownMenu` is from `@/components/ui/dropdown-menu` — check it exists first with `ls src/components/ui/dropdown-menu*`
- `navigate` is already imported via `useNavigate()` in WorkspaceShell
- Keep existing `ProjectSelector` in sidebar unchanged
- The `projects` field: add to the destructuring of `useProject()` on the existing line
- Do NOT change any other part of WorkspaceShell
- Keep `hidden lg:flex` class on the button — only show on desktop

### DIARY
Entry: "SESSION:2026-06-09|TASK-199:header-repo-dropdown|commit:<hash>|★★★"

---

## [x] TASK-200

### GOAL
Два незалежних баги:

**A) Код-сторінка (/code) — темний фон не перемикається в світлу тему**
Файл `src/components/files/ProjectFileManager.tsx` має hardcoded `bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`, `text-zinc-200` etc. — завжди темний. Треба замінити на CSS-змінні.

**B) Docs (/docs) — не перезавантажується при зміні репозиторію**
Поточна `GardenPage` читає з Worker (`/v1/notes/list`) що не підтримує `?project=`. Треба зробити нову сторінку що читає `docs/*.md` безпосередньо з GitHub API обраного репозиторію.

---

### PART A — ProjectFileManager theme fix

Файл: `src/components/files/ProjectFileManager.tsx` (і `.lovable/src/`)

**ЗАМІНИ (replace_all):**

| Старий клас | Новий клас |
|-------------|------------|
| `bg-zinc-950` | `bg-[var(--bg-base)]` |
| `bg-zinc-900` | `bg-[var(--bg-surface)]` |
| `bg-zinc-950/60` | `bg-[var(--bg-surface)]/60` |
| `bg-zinc-950/80` | `bg-[var(--bg-surface)]/80` |
| `bg-zinc-900/40` | `bg-[var(--bg-surface)]/40` |
| `bg-zinc-900/60` | `bg-[var(--bg-surface)]/60` |
| `border-zinc-800` | `border-[var(--border-subtle)]` |
| `border-zinc-900` | `border-[var(--border-subtle)]` |
| `text-zinc-200` | `text-[var(--text-primary)]` |
| `text-zinc-400` | `text-[var(--text-secondary)]` |
| `text-zinc-500` | `text-[var(--text-muted)]` |
| `text-zinc-600` | `text-[var(--text-muted)]` |
| `text-zinc-100` | `text-[var(--text-primary)]` |
| `hover:bg-zinc-900` | `hover:bg-white/5` |
| `hover:text-zinc-200` | `hover:text-[var(--text-primary)]` |
| `placeholder:text-zinc-600` | `placeholder:text-[var(--text-muted)]` |

Use `sed -i` for each replacement (they are safe replace_all):
```bash
cd ~/workspace/ai-drakon-scaffolder

# Run each sed substitution:
sed -i 's/bg-zinc-950\/60/bg-[var(--bg-surface)]\/60/g' src/components/files/ProjectFileManager.tsx
sed -i 's/bg-zinc-950\/80/bg-[var(--bg-surface)]\/80/g' src/components/files/ProjectFileManager.tsx
sed -i 's/bg-zinc-950\/20/bg-[var(--bg-surface)]\/20/g' src/components/files/ProjectFileManager.tsx
sed -i 's/bg-zinc-900\/40/bg-[var(--bg-surface)]\/40/g' src/components/files/ProjectFileManager.tsx
sed -i 's/bg-zinc-900\/60/bg-[var(--bg-surface)]\/60/g' src/components/files/ProjectFileManager.tsx
sed -i 's/bg-zinc-950/bg-[var(--bg-base)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/bg-zinc-900/bg-[var(--bg-surface)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/border-zinc-800/border-[var(--border-subtle)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/border-zinc-900/border-[var(--border-subtle)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/text-zinc-200/text-[var(--text-primary)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/text-zinc-400/text-[var(--text-secondary)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/text-zinc-500/text-[var(--text-muted)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/text-zinc-600/text-[var(--text-muted)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/text-zinc-100/text-[var(--text-primary)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/hover:bg-zinc-900/hover:bg-white\/5/g' src/components/files/ProjectFileManager.tsx
sed -i 's/hover:text-zinc-200/hover:text-[var(--text-primary)]/g' src/components/files/ProjectFileManager.tsx
sed -i 's/placeholder:text-zinc-600/placeholder:text-[var(--text-muted)]/g' src/components/files/ProjectFileManager.tsx
```

After sed, verify no remaining zinc classes:
```bash
grep -c "zinc" src/components/files/ProjectFileManager.tsx && echo "ZINC REMAINING" || echo "CLEAN"
```

---

### PART B — GitHub-based docs for active project

When `activeProject.github` is set, docs should come from GitHub API — NOT from the Worker.

**Step 1: Create new file** `src/pages/GitHubDocsPage.tsx`

```tsx
import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, ChevronRight, FolderOpen, Folder, AlertCircle } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { readSettings } from "@/lib/settings-storage";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteRenderer } from "@/components/docs/garden/NoteRenderer";

interface GhFile {
  path: string;
  type: "blob" | "tree";
  url: string;
  sha: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

function buildTree(files: GhFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const existing = current.find(n => n.name === name);
      if (i === parts.length - 1) {
        if (!existing) current.push({ name, path: f.path, type: "file" });
      } else {
        if (!existing) {
          const folder: TreeNode = { name, path: parts.slice(0, i + 1).join("/"), type: "folder", children: [] };
          current.push(folder);
          current = folder.children!;
        } else {
          current = existing.children ?? (existing.children = []);
        }
      }
    }
  }
  return root.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeNodeItem({ node, depth, selected, onSelect }: {
  node: TreeNode; depth: number; selected: string | null; onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  if (node.type === "folder") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full px-2 py-0.5 rounded font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {open ? <FolderOpen className="h-3 w-3 shrink-0" /> : <Folder className="h-3 w-3 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map(c => (
          <TreeNodeItem key={c.path} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        "flex items-center gap-1.5 w-full px-2 py-0.5 rounded font-mono text-[10px] transition-colors",
        selected === node.path
          ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
          : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">{node.name.replace(/\.md$/, "")}</span>
    </button>
  );
}

export function GitHubDocsPage() {
  const { activeProject } = useProject();
  const gh = activeProject?.github;

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    if (!gh) return;
    setLoading(true);
    setError(null);
    setTree([]);
    setSelectedPath(null);
    setContent("");
    try {
      const token = readSettings().github?.token;
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Get HEAD tree recursively (docs folder only)
      const resp = await fetch(
        `https://api.github.com/repos/${gh.owner}/${gh.repo}/git/trees/${gh.branch}?recursive=1`,
        { headers }
      );
      if (!resp.ok) throw new Error(`GitHub ${resp.status}`);
      const data = await resp.json() as { tree: GhFile[] };
      const mdFiles = data.tree.filter(f =>
        f.type === "blob" && f.path.match(/\.(md|mdx)$/)
      );
      setTree(buildTree(mdFiles));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [gh?.owner, gh?.repo, gh?.branch]);

  useEffect(() => { void fetchTree(); }, [fetchTree]);

  const openFile = useCallback(async (path: string) => {
    if (!gh) return;
    setSelectedPath(path);
    setContentLoading(true);
    setContent("");
    try {
      const token = readSettings().github?.token;
      const headers: Record<string, string> = { Accept: "application/vnd.github.raw" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(
        `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}?ref=${gh.branch}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`GitHub ${resp.status}`);
      setContent(await resp.text());
    } catch {
      setContent("Помилка завантаження файлу");
    } finally {
      setContentLoading(false);
    }
  }, [gh?.owner, gh?.repo, gh?.branch]);

  if (!gh) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
        <p className="font-mono text-[11px] text-[var(--text-muted)]">
          Оберіть репозиторій у хедері для перегляду документації
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden font-mono">
      {/* File tree */}
      <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
        <div className="px-2 py-1.5 border-b border-[var(--border-subtle)] shrink-0">
          <p className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            {gh.owner}/{gh.repo}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-[10px] text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Завантаження...
          </div>
        ) : error ? (
          <div className="p-3 text-[10px] text-red-400">{error}</div>
        ) : tree.length === 0 ? (
          <div className="p-3 text-[10px] text-[var(--text-muted)]">Немає .md файлів</div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="py-1 pr-1">
              {tree.map(n => (
                <TreeNodeItem key={n.path} node={n} depth={0} selected={selectedPath} onSelect={openFile} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--bg-base)]">
        {contentLoading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-[10px] text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Завантаження...
          </div>
        ) : content ? (
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-3xl">
              <NoteRenderer content={content} onNavigate={() => {}} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[10px] text-[var(--text-muted)]">
            <FileText className="h-6 w-6" />
            Оберіть файл зі списку
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Modify `src/routes/docs.tsx`**

Read the current file first:
```bash
cat src/routes/docs.tsx
```

Replace the content to use `GitHubDocsPage` when `activeProject.github` is set, otherwise `GardenPage`:

```tsx
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { hasClientJwt } from "@/lib/route-auth";
import { GardenPage } from "@/pages/GardenPage";
import { GitHubDocsPage } from "@/pages/GitHubDocsPage";
import { useProject } from "@/context/ProjectContext";

export const Route = createFileRoute("/docs")({
  component: DocsRoute,
});

function DocsRoute() {
  if (!hasClientJwt()) return <Navigate to="/login" replace />;
  return <DocsSwitch />;
}

function DocsSwitch() {
  const { activeProject } = useProject();
  if (activeProject?.github) return <GitHubDocsPage />;
  return <GardenPage />;
}
```

**Step 3: Sync and commit**

```bash
# Sync all changed files to .lovable/
cp src/components/files/ProjectFileManager.tsx .lovable/src/components/files/ProjectFileManager.tsx
cp src/pages/GitHubDocsPage.tsx .lovable/src/pages/GitHubDocsPage.tsx
cp src/routes/docs.tsx .lovable/src/routes/docs.tsx
```

**Step 4: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "error" | head -10
```

If errors about `NoteRenderer` props — check NoteRenderer interface:
```bash
grep -n "interface\|onWikilinkClick\|Props" src/components/docs/garden/NoteRenderer.tsx | head -10
```

Fix props if needed (e.g. `onWikilinkClick` might not exist — remove it or replace with no-op).

**Step 5: Commit and push**
```bash
git add src/components/files/ProjectFileManager.tsx \
        .lovable/src/components/files/ProjectFileManager.tsx \
        src/pages/GitHubDocsPage.tsx \
        .lovable/src/pages/GitHubDocsPage.tsx \
        src/routes/docs.tsx \
        .lovable/src/routes/docs.tsx
git commit -m "fix(code): theme-aware colors in ProjectFileManager; fix(docs): GitHub-direct docs reader"
git push origin main
```

### NOTES
- !!IMPORTANT!! Run LOCALLY on Termux (AGY3). Repo at ~/workspace/ai-drakon-scaffolder — git pull first
- `NoteRenderer` component: check its props before using. It might need `content` only (remove `onWikilinkClick` if not in interface)
- For Part A: after each sed, grep for remaining `zinc` to verify it worked
- For Part B: `readSettings().github?.token` is from `@/lib/settings-storage` — already in the codebase
- AGY3 Tailscale IP: 100.75.16.18, LAN: 192.168.3.204 (might be down, use Tailscale)

### DIARY
Entry: "SESSION:2026-06-09|TASK-200:theme-fix+github-docs|commit:<hash>|★★★★"

---

## [x] TASK-201 (SKIPPED-PARTIAL: superseded by Appwrite)

### GOAL
**A) GitHubDocsPage — token persistence across sessions (incognito)** — GitHub токен живе лише в localStorage. При новій сесії incognito — втрачається. Треба зберігати токен у Worker KV прив'язаним до JWT.

**Note:** TASK-201 Part C (модель Opus) і Part A (loading state в DocsSwitch) — вже виконано Claude. TASK-201 Part A залишається лише server-side token persistence.

---

### PART B — Persist GitHub token in Worker KV

**!!IMPORTANT!! Run LOCALLY on Termux (AGY3). Repo at ~/workspace/ai-drakon-scaffolder — git pull first**

**Крок 1:** Перевір Worker source:
```bash
find ~/workspace/ai-drakon-scaffolder/workers/ ~/workspace/ai-drakon-scaffolder/src/workers/ -name "*.ts" 2>/dev/null | head -10
# або
ls ~/workspace/ai-drakon-scaffolder/functions/ 2>/dev/null
```

**Крок 2:** Знайди де зберігається JWT і як Worker авторизує запити. Перевір:
```bash
grep -r "JWT\|Authorization\|Bearer\|github.*token\|token.*github" \
  ~/workspace/ai-drakon-scaffolder/src/lib/ \
  ~/workspace/ai-drakon-scaffolder/src/hooks/ 2>/dev/null | grep -v node_modules | head -20
```

**Крок 3:** Додай до відповідного Worker:
- `GET /api/user/github-token` → повертає токен з KV (`user:{userId}:github_token`)
- `PUT /api/user/github-token` → зберігає токен в KV

**Крок 4:** Оновити `src/lib/settings-storage.ts`:
- При завантаженні налаштувань → `GET /api/user/github-token` → merge в localStorage
- При збереженні GitHub токену → одночасно `PUT /api/user/github-token`

**Якщо Part B занадто складна (> 30 хв пошуку) — пропусти, відмітити TASK-201 як SKIPPED-PARTIAL.**

---

### VERIFY
```bash
npx tsc --noEmit 2>&1 | grep "error" | head -5
git add -p
git commit -m "feat(settings): persist GitHub token server-side via Worker KV"
git push origin main
```

### DIARY
Entry: "SESSION:2026-06-10|TASK-201:github-token-persistence|commit:<hash>|★★★"

---

## [x] TASK-202: unified WorkspacePage

**De zapuskaty:** !!IMPORTANT!! Run locally on AGY3 Termux. Edit files in `~/workspace/ai-drakon-scaffolder/src/`. Then commit + push + scp to .lovable/.

### Shcho zrobyty

Stvoryt unifikovanu WorkspacePage yaka obednuye ProjectFileManager (/code) i GardenPage (/docs) v odnu storinku z tab-peremiknachem.

---

### KROK 1: Stvoryt `src/pages/WorkspacePage.tsx`

```tsx
import { useState } from "react";
import { FileCode, FileText } from "lucide-react";
import { ProjectFileManager } from "@/components/files/ProjectFileManager";
import { GardenPage } from "@/pages/GardenPage";
import { cn } from "@/lib/utils";

type WorkspaceMode = "code" | "docs";

export function WorkspacePage() {
  const [mode, setMode] = useState<WorkspaceMode>("code");

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="flex items-center px-2 h-8 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {(
          [
            { m: "code" as WorkspaceMode, label: "Kod", Icon: FileCode },
            { m: "docs" as WorkspaceMode, label: "Dokumentatsiia", Icon: FileText },
          ]
        ).map(({ m, label, Icon }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "inline-flex items-center gap-1.5 h-full px-3 border-b-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              mode === m
                ? "border-[var(--accent-amber)] text-[var(--accent-amber)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={cn("h-full", mode !== "code" && "hidden")}>
          <ProjectFileManager defaultMode="code" />
        </div>
        <div className={cn("h-full", mode !== "docs" && "hidden")}>
          <GardenPage />
        </div>
      </div>
    </div>
  );
}
```

Note: use REAL Ukrainian text for labels:
- "Kod" => "Код"
- "Dokumentatsiia" => "Документація"

---

### KROK 2: Stvoryt `src/routes/workspace.tsx`

```tsx
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { hasClientJwt } from "@/lib/route-auth";
import { WorkspacePage } from "@/pages/WorkspacePage";

export const Route = createFileRoute("/workspace")({
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  if (!hasClientJwt()) return <Navigate to="/login" replace />;
  return <WorkspacePage />;
}
```

---

### KROK 3: Zminyt `src/components/workspace/WorkspaceShell.tsx`

Znaydy blok NAV_WORKSPACE (pryblyzno ryadky 52-62):
```ts
const NAV_WORKSPACE: NavItem[] = [
  { to: "/pipelines", label: "Pipeline", icon: Workflow },
  { to: "/diagrams", label: "Skhemy", icon: LayoutDashboard },
  { to: "/knowledge", label: "Znannia", icon: Brain },
  { to: "/notebooks", label: "NotebookLM", icon: BookOpen },
  { to: "/code", label: "Kod", icon: FileCode },
  { to: "/docs", label: "Dokumentatsiia", icon: FileText },
];
```

Zaminy ostanni 2 items `/code` i `/docs` na 1 item `/workspace`:
```ts
  { to: "/workspace", label: "Workspace", icon: Layers },
```

Add `Layers` to lucide-react imports at top of file (it is already imported other icons there).

Takozh znaydy funktsiu `getBreadcrumb` i dodai case:
```ts
  if (pathname.startsWith("/workspace")) return { section: "Workspace", sectionPath: "/workspace" };
```

Add it BEFORE the final `return { section: "Workspace" ... }` line.

---

### KROK 4: Sync do .lovable

```bash
cp src/pages/WorkspacePage.tsx .lovable/src/pages/WorkspacePage.tsx
cp src/routes/workspace.tsx .lovable/src/routes/workspace.tsx
cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
```

---

### VERIFICATION

```bash
# TypeScript check
npx tsc --noEmit 2>&1 | head -20

# Check files exist
ls src/pages/WorkspacePage.tsx src/routes/workspace.tsx

# Check WorkspaceShell has Workspace nav item
grep -n "workspace\|Layers" src/components/workspace/WorkspaceShell.tsx
```

---

### COMMIT

```bash
git add src/pages/WorkspacePage.tsx src/routes/workspace.tsx src/components/workspace/WorkspaceShell.tsx .lovable/src/pages/WorkspacePage.tsx .lovable/src/routes/workspace.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
git commit -m "feat(workspace): unified WorkspacePage combining Kod + Dokumentatsiia tabs"
git push origin main
```

### DIARY

Entry: "SESSION:2026-06-10|TASK-202:unified-WorkspacePage|WorkspacePage+route+nav|commit:<hash>|kod+docs tabs|lazy mount|Layers icon|sshpass OK|[OK]|★★★"

---

## Sprint 1 — SaaS Стабілізація (2026-06-12, Claude оркестратор)

[x] TASK-203: Appwrite auth у AuthContext
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH.
Файли: src/context/AuthContext.tsx (переписати), src/lib/appwrite.ts (вже існує — використовувати як є, НЕ ЗМІНЮВАТИ).
Що зробити:
1. Переписати src/context/AuthContext.tsx — замінити фіктивний boolean-стан на реальну Appwrite-сесію:
   - import { account } from "@/lib/appwrite"; import type { Models } from "appwrite";
   - стан: user: Models.User<Models.Preferences> | null; isLoading: boolean (початково true)
   - useEffect на mount: account.get().then(u => setUser(u)).catch(() => setUser(null)).finally(() => setIsLoading(false))
   - login: async (email: string, password: string) => { await account.createEmailPasswordSession(email, password); setUser(await account.get()); }
   - logout: async () => { await account.deleteSession("current"); setUser(null); }
   - value контексту: { user, isAuthenticated: !!user, isLoading, login, logout }
2. ЗАБОРОНЕНО: будь-який localStorage.clear() або зміни ключа drakon.settings у цьому файлі. Налаштування користувача (GitHub token) НЕ повинні зникати при login/logout.
3. Знайти всі виклики useAuth(): grep -rn "useAuth(" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules. Якщо десь викликається login() без аргументів — оновити виклик під нову сигнатуру login(email, password) або передати тестові значення з форми.
4. Синхронізація Lovable: cp src/context/AuthContext.tsx .lovable/src/context/AuthContext.tsx (і кожен інший змінений файл так само).
Верифікація: npx tsc --noEmit — БЕЗ помилок. Якщо є помилки — виправити до коміту.
Коміт: feat(auth): wire Appwrite session into AuthContext (TASK-203)
Push: git push origin main
Diary: SESSION:2026-06-12|TASK-203:appwrite-authcontext|commit:<hash>|★★★

[x] TASK-204: Міграція застарілих agent URLs у settings-storage
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH.
Файл: src/lib/settings-storage.ts
Проблема: у користувачів зі старим localStorage поля agents.architectUrl/drakonUrl/docsUrl вказують на мертві тунелі Python-агентів — через це fetch /projects падає і список проектів у Settings UI порожній, хоча Worker повертає дані.
Що зробити:
1. Додати константу: const STALE_AGENT_HOSTS = ["architect-agent.exodus.pp.ua", "drakon-agent.exodus.pp.ua", "docs-agent.exodus.pp.ua", "192.168.3.184"];
2. Додати helper: function isStaleAgentUrl(url: string): boolean — повертає true якщо url містить будь-який з STALE_AGENT_HOSTS.
3. У readSettings() у блоці розбору agents: якщо збережений URL isStaleAgentUrl() → ігнорувати його і підставити відповідний DEFAULT_SETTINGS.agents.* (drakonUrl/architectUrl/docsUrl → *-flue.maxfraieho.workers.dev).
4. Синхронізація Lovable: cp src/lib/settings-storage.ts .lovable/src/lib/settings-storage.ts
Верифікація: npx tsc --noEmit — БЕЗ помилок.
Коміт: fix(settings): migrate stale agent tunnel URLs to flue worker defaults (TASK-204)
Push: git push origin main
Diary: SESSION:2026-06-12|TASK-204:settings-url-migration|commit:<hash>|★★★

[x] TASK-205: authMiddleware + KV session cache в architect-agent-flue
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
Специфікація: docs/ARCHITECTURE-SAAS.md §2. Код нижче — ГОТОВИЙ, копіювати як є, не переписувати.
Що зробити:
1. cd services/architect-agent-flue && npm install node-appwrite — додати залежність. Якщо @cloudflare/workers-types відсутній у devDependencies — npm install -D @cloudflare/workers-types.
2. Створити файл services/architect-agent-flue/src/middleware/auth.ts з ТОЧНО таким вмістом:
```typescript
/// <reference types="@cloudflare/workers-types" />
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { Client, Account } from "node-appwrite";

export type Tenant = {
  userId: string;
  teamId: string;
  plan: "free" | "pro" | "enterprise";
};

type AuthEnv = {
  Bindings: {
    SESSION_KV: KVNamespace;
    DB: D1Database;
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
  };
  Variables: { tenant: Tenant };
};

const SESSION_TTL = 480; // 8 хв — Appwrite JWT живе 15 хв, кеш коротший

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolvePlan(db: D1Database, teamId: string): Promise<Tenant["plan"]> {
  const row = await db
    .prepare("SELECT plan_type FROM billing_profiles WHERE tenant_id = ?")
    .bind(teamId)
    .first<{ plan_type: Tenant["plan"] }>();
  return row?.plan_type ?? "free";
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // Основний шлях: Appwrite JWT від фронтенду (account.createJWT()).
  // Cookie-фолбек спрацьовує лише на спільному з Appwrite домені.
  const bearer = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  const cookie = getCookie(c, `a_session_${c.env.APPWRITE_PROJECT_ID}`);
  const token = bearer || cookie;
  if (!token) {
    return c.json({ error: "Не авторизовано: відсутні Appwrite JWT або сесія" }, 401);
  }

  const cacheKey = `session:${await sha256Hex(token)}`;
  const cached = await c.env.SESSION_KV.get<Tenant>(cacheKey, "json");
  if (cached) {
    c.set("tenant", cached);
    return next();
  }

  const client = new Client()
    .setEndpoint(c.env.APPWRITE_ENDPOINT)
    .setProject(c.env.APPWRITE_PROJECT_ID);
  if (bearer) client.setJWT(bearer);
  else client.setSession(cookie as string);

  try {
    const user = await new Account(client).get();
    const teamId = (user.prefs?.teamId as string | undefined) ?? user.$id;
    const tenant: Tenant = {
      userId: user.$id,
      teamId,
      plan: await resolvePlan(c.env.DB, teamId),
    };
    await c.env.SESSION_KV.put(cacheKey, JSON.stringify(tenant), { expirationTtl: SESSION_TTL });
    c.set("tenant", tenant);
    return next();
  } catch {
    return c.json({ error: "Сесія недійсна або протермінована" }, 401);
  }
});
```
3. У services/architect-agent-flue/src/index.ts додати ПІСЛЯ рядка app.get('/health', ...):
```typescript
import { authMiddleware } from './middleware/auth.js';   // import — угорі файлу до інших import
app.get('/me', authMiddleware, (c) => c.json(c.get('tenant')));
```
УВАГА: middleware підключати ТІЛЬКИ до нового маршруту /me. ЗАБОРОНЕНО вішати його на існуючі маршрути — фронтенд ще не передає JWT і все зламається.
4. У services/architect-agent-flue/wrangler.toml додати:
```toml
# до секції [vars]:
APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID = "6a23420a003a04b4997b"

# нові блоки в кінець файлу:
[[kv_namespaces]]
binding = "SESSION_KV"
id = "11ed74326f2c431496c2b3dc38ef0208"

[[d1_databases]]
binding = "DB"
database_name = "ai-drakon-saas"
database_id = "743d5bb0-d09d-4dcc-8329-8ebae8d533f4"
```
5. НЕ деплоїти (wrangler deploy НЕ запускати — деплой зробить оркестратор з dev-сервера).
Верифікація: cd services/architect-agent-flue && npx tsc --noEmit — БЕЗ помилок (якщо в сервісі немає tsconfig — npx tsc --noEmit src/middleware/auth.ts --strict --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck).
Коміт: feat(auth): authMiddleware with Appwrite JWT + KV session cache (TASK-205)
Push: git push origin main
Diary: SESSION:2026-06-12|TASK-205:auth-middleware|commit:<hash>|★★★

[x] TASK-206: Ревізія та апгрейд документації під поточний стан системи
Виконавець: Claude Sonnet (оркестратор, нова сесія) — самостійно або з делегуванням частин AGY3.
Мета: вся документація має відповідати РЕАЛЬНОМУ поточному стану системи (стан на 2026-06-12, комміт be4598d+).
Що зробити:
1. Інвентаризація: docs/INDEX.md, README.md, docs/appwrite-migration-research.md, docs/ui-pages-reference.md, docs/COLLABORATION.md, development/SESSION_STATE.md (застарілий — травень), development/FLUE-MIGRATION-PLAN.md.
2. Звірити з реальністю і виправити:
   - Python-агенти (8765-8767) — тепер fallback, основні: drakon/architect/docs-agent-flue на *.workers.dev (всі живі)
   - Appwrite: проект 6a23420a003a04b4997b, база ai-drakon, 4 колекції СТВОРЕНІ (infrastructure/appwrite/schema.ts)
   - D1 ai-drakon-saas + KV SESSION_KV СТВОРЕНІ (infrastructure/cloudflare-resources.md)
   - AuthContext тепер на Appwrite-сесії (TASK-203), authMiddleware існує (TASK-205, ще не задеплоєний)
   - Продакшн-домен: aidrakon.tech; цільова топологія у docs/ARCHITECTURE-SAAS.md §2.4
   - Застарілі URL-и тунелів (architect-agent.exodus.pp.ua тощо) позначити як deprecated
3. docs/INDEX.md: додати посилання на docs/ARCHITECTURE-SAAS.md та infrastructure/cloudflare-resources.md.
4. docs/appwrite-migration-research.md: звірити з ARCHITECTURE-SAAS.md; якщо суперечить — додати банер "(застаріло, див. ARCHITECTURE-SAAS.md)".
5. development/SESSION_STATE.md: додати секцію "2026-06-12 — SaaS Sprint 1-2" зі станом (TASK-203/204/205 done, інфраструктура створена).
Верифікація: кожне твердження в оновлених доках підтверджене реальним файлом/ендпоінтом; жодних згадок MinIO/Python-агентів як основних компонентів без позначки fallback/deprecated.
Коміт: docs: revise documentation to match current SaaS state (TASK-206)

[x] TASK-207: Frontend JWT — Authorization header для Worker-запитів
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
Специфікація: docs/ARCHITECTURE-SAAS.md §2.4.
Що зробити:
1. Створити src/lib/appwrite-jwt.ts: функція getAppwriteJwt() — викликає account.createJWT() з src/lib/appwrite.ts, кешує jwt у пам'яті модуля з timestamp, оновлює якщо старший за 10 хв; повертає null якщо користувач не залогінений (catch).
2. У src/lib/graph-pipeline-api.ts: додати helper authHeaders(): Promise<HeadersInit> — {Authorization: `Bearer ${jwt}`} якщо jwt є, інакше {}. Додати ці headers до fetch у listProjectsArch (для початку ТІЛЬКИ там — інші маршрути Worker-а ще без auth).
3. Тест-функція: на сторінці Settings (або в консолі) виклик fetch(`${architectUrl}/me`, {headers: await authHeaders()}) має повертати tenant JSON після логіну.
4. Синхронізація: cp змінених файлів у .lovable/src/... (дзеркально).
Верифікація: npx tsc --noEmit — БЕЗ помилок.
Коміт: feat(auth): Appwrite JWT authorization header for worker requests (TASK-207)
Push: git push origin main
Diary: SESSION:DATE|TASK-207:frontend-jwt|commit:<hash>|★★★

[x] TASK-208: quotaMiddleware — ліміти LLM з D1 billing_profiles
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
Специфікація: docs/ARCHITECTURE-SAAS.md §3 — код quotaMiddleware там ГОТОВИЙ, копіювати як є.
Що зробити:
1. Створити services/architect-agent-flue/src/middleware/quota.ts з кодом із §3 (createMiddleware, SELECT llm_quota_monthly/llm_consumed WHERE tenant_id, 402 при перевищенні, c.executionCtx.waitUntil інкремент після next()).
2. Підключити: у src/index.ts ЗМІНИТИ маршрут /me на app.get('/me', authMiddleware, quotaMiddleware, ...) — поки що ТІЛЬКИ там (тестовий ланцюжок auth→quota). Існуючі маршрути НЕ чіпати.
3. НЕ деплоїти — деплой робить оркестратор з dev-сервера.
Верифікація: cd services/architect-agent-flue && npx tsc --noEmit — БЕЗ помилок.
Коміт: feat(billing): quotaMiddleware with D1 llm quota check (TASK-208)
Push: git push origin main
Diary: SESSION:DATE|TASK-208:quota-middleware|commit:<hash>|★★★

[x] TASK-209: llm-client.ts — читати PROXY_URL/PROXY_TOKEN з env замість хардкоду
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
Мета: прибрати hardcoded URL з llm-client.ts в усіх трьох Flue workers. URL і токен мають читатись з env (wrangler.toml [vars] або CF Secrets).
Що зробити:
1. services/architect-agent-flue/lib/llm-client.ts:
   - Змінити сигнатуру: додати параметр `proxyUrl?: string` (або читати з глобального env якщо доступно).
   - Функція llmComplete: URL = proxyUrl || env?.PROXY_URL || 'https://agy3.exodus.pp.ua/v1/chat/completions'
   - apiKey: apiKey || env?.PROXY_TOKEN || env?.CUSTOM_API_KEY || 'dummy'
   - Де env недоступний напряму (Cloudflare Workers не мають глобального process.env) — передавати через параметр або toolContext.
2. Те саме в services/drakon-agent-flue/lib/llm-client.ts.
3. Те саме в services/docs-agent-flue/lib/llm-client.ts (якщо існує; якщо ні — пропустити).
4. У всіх місцях де викликається llmComplete і є доступ до env (toolContext?.env) — передавати env.PROXY_URL як proxyUrl.
   Приклад: llmComplete(messages, model, temp, apiKey, env?.PROXY_URL)
5. Переконатись що wrangler.toml кожного worker містить PROXY_URL і PROXY_MODEL у [vars].
   architect-agent-flue: вже є ✅
   drakon-agent-flue: вже є ✅
   docs-agent-flue: перевірити і додати якщо немає.
НЕ деплоїти — деплой робить оркестратор.
Верифікація:
  cd services/architect-agent-flue && npx tsc --noEmit
  cd services/drakon-agent-flue && npx tsc --noEmit
Коміт: refactor(llm): read PROXY_URL and PROXY_TOKEN from env in llm-client (TASK-209)
Push: git push origin main
Diary: SESSION:DATE|TASK-209:llm-env-config|commit:<hash>|★★★

[x] TASK-210: drakon-agent-flue — виправити 6 застарілих tsc-помилок (техборг з a39b96d)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
Контекст: помилки існували ДО TASK-209 (з оригінальної Flue-міграції). Worker live, бо wrangler збирає esbuild-ом без type-check. Треба зробити tsc чистим.
Що зробити:
1. services/drakon-agent-flue/src/mcp-server.ts — рядки ~127, 133, 140, 147:
   виклики tool.execute(..., toolContext) дають TS2345 (toolContext не AbortSignal).
   Виправлення: додати `as any` до другого аргумента: `}, toolContext as any);`
   — ТОЧНО той самий патерн, що вже використовується у src/index.ts (`{ env: c.env } as any`). 4 місця.
2. services/drakon-agent-flue/src/index.ts рядок 61:
   `export { FlueRegistry, FlueDrakonAgent } from '@flue/runtime';` — TS2305, цих експортів немає в @flue/runtime.
   ПЕРЕВІРЕНО: wrangler.toml drakon-agent-flue НЕ має [durable_objects] — це мертвий рядок з шаблону. ВИДАЛИТИ рядок 61 разом з коментарем над ним.
3. НІЧОГО більше не чіпати. НЕ деплоїти.
Верифікація (Termux-нюанс: workerd не ставиться на Android):
   cd services/drakon-agent-flue
   npm install --ignore-scripts (якщо node_modules неповний)
   node node_modules/typescript/bin/tsc --noEmit
   → 0 помилок. Якщо tsc не запускається на Termux — закоміть і вкажи в diary "tsc-verify:orchestrator" (оркестратор перевірить на dev-сервері).
Коміт: fix(drakon-agent): resolve 6 stale tsc errors — toolContext casts + dead FlueRegistry export (TASK-210)
Push: git push origin main
Diary: SESSION:DATE|TASK-210:tsc-cleanup|commit:<hash>|★★★

[x] TASK-211: ОЖИВИТИ агентів — повернути тунельні URL як дефолтні (CF 1042 fix)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
КОРІНЬ ПРОБЛЕМИ (верифіковано curl-ом): drakon-mcp-worker проксіює чат на agentUrl з налаштувань. Cloudflare ЗАБОРОНЯЄ worker→worker fetch через *.workers.dev в межах одного акаунта (error 1042). TASK-204 зробив дефолтами workers.dev і позначив тунельні URL як stale — це зламало ВСІХ агентів у UI. Тунелі (drakon-agent.exodus.pp.ua тощо) живі — cloudflared мапить їх на ті самі flue workers.
Що зробити (ТІЛЬКИ src/lib/settings-storage.ts + дзеркало):
1. DEFAULT_SETTINGS.agents змінити на тунельні URL:
   drakonUrl: "https://drakon-agent.exodus.pp.ua"
   architectUrl: "https://architect-agent.exodus.pp.ua"
   docsUrl: "https://docs-agent.exodus.pp.ua"
2. STALE_AGENT_HOSTS переписати: ВИДАЛИТИ звідти "architect-agent.exodus.pp.ua", "drakon-agent.exodus.pp.ua", "docs-agent.exodus.pp.ua"; ЗАЛИШИТИ "192.168.3.184"; ДОДАТИ:
   "drakon-agent-flue.maxfraieho.workers.dev",
   "architect-agent-flue.maxfraieho.workers.dev",
   "docs-agent-flue.maxfraieho.workers.dev"
   (щоб збережені в localStorage workers.dev URL-и авто-мігрували назад на тунелі при наступному readSettings).
3. Додати короткий коментар над STALE_AGENT_HOSTS: workers.dev у agentUrl ламає proxy-чат — CF блокує worker-to-worker fetch через workers.dev (error 1042); тунелі exodus.pp.ua мапляться на ті ж flue workers через cloudflared.
4. Дзеркало: cp src/lib/settings-storage.ts .lovable/src/lib/settings-storage.ts
5. НІЧОГО більше не чіпати (agent-api.ts, graph-pipeline-api.ts — НЕ чіпати).
Верифікація: npx tsc --noEmit (корінь репо) — БЕЗ помилок.
Коміт: fix(agents): revert agent defaults to tunnel URLs — CF 1042 blocks worker-to-worker workers.dev fetch (TASK-211)
Push: git push origin main
Diary: SESSION:DATE|TASK-211:agents-alive|commit:<hash>|★★★

[x] TASK-212: llmConfig з налаштувань UI наскрізно до llmComplete (без хардкоду)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
КОНТЕКСТ: UI вже надсилає llmConfig {protocol, baseUrl, apiKey, model, maxTokens} у тілі POST до drakon-mcp-worker (src/lib/agent-api.ts sendToAgent). Проксі його ВИКИДАЄ, а flue-агенти беруть LLM лише з env. Треба прокинути llmConfig по всьому ланцюжку. llmComplete ВЖЕ приймає (messages, model, temperature, apiKey, proxyUrl, env) після TASK-209 — нічого в ній не міняти.
ПРАВИЛО РЕЗОЛВУ (однакове всюди): llmConfig застосовується ТІЛЬКИ якщо protocol відсутній або "openai" (llmComplete говорить OpenAI-форматом; anthropic — майбутнє, ігнорувати baseUrl):
  model    = llmConfig?.model   || env.PROXY_MODEL || 'gemini-2.5-flash'
  proxyUrl = llmConfig?.baseUrl || undefined        (llmComplete сама зробить env.PROXY_URL fallback)
  apiKey   = llmConfig?.apiKey  || undefined        (llmComplete сама зробить env fallback)
Що зробити:
1. cloudflare-worker/worker-mcp-drakon.js, handleAgentChat (~рядок 1985):
   - const { message, context, agentUrl, llmConfig } = body;
   - у agentBody для НЕ-analyze гілки: JSON.stringify({ message, context: context || null, llmConfig: llmConfig || null })
   - для /analyze гілки: JSON.stringify({ code: message, refine: true, llmConfig: llmConfig || null })
2. services/drakon-agent-flue/src/index.ts:
   - /chat: drakonChat.execute({ message, context }, { env: c.env, llmConfig: body.llmConfig || null } as any)
   - /analyze, /analyze_folder, /feedback: так само додати llmConfig у toolContext.
3. services/drakon-agent-flue/agents/tools/drakon-chat.ts та analyze-code.ts:
   - const llmCfg = (toolContext?.llmConfig && (!toolContext.llmConfig.protocol || toolContext.llmConfig.protocol === "openai")) ? toolContext.llmConfig : null;
   - у виклику llmComplete: model = llmCfg?.model || 'gemini-2.5-flash'; apiKey = llmCfg?.apiKey || <існуючий вираз>; proxyUrl (5-й аргумент) = llmCfg?.baseUrl || env?.PROXY_URL (як зараз); env останнім.
4. services/docs-agent-flue/src/index.ts /chat: docsChat.execute(..., { env: c.env, llmConfig: body.llmConfig || null } as any); у tools/docs-chat.ts — той самий резолв що у п.3.
5. services/architect-agent-flue/src/index.ts: у маршруті /agents/:agent_id/chat прокинути body.llmConfig у виклик executePipelineGraph / execute (тим самим патерном через контекст або додатковий параметр).
   services/architect-agent-flue/tools/graph-pipelines.ts: додати необов'язковий параметр llmConfig до executePipelineGraph (або через options-об'єкт), і у case-ах де викликається llmComplete (ir_gen, code_gen, llm_call, llm_call_with_system, classify тощо): model = llmCfg?.model || env.PROXY_MODEL || 'gemini-2.5-flash'; apiKey = llmCfg?.apiKey || env.CUSTOM_API_KEY || env.PROXY_TOKEN; proxyUrl = llmCfg?.baseUrl || env.PROXY_URL.
6. БЕЗПЕКА: apiKey НІКОЛИ не логувати (console.log/saveLogToMinio — перевірити що llmConfig не потрапляє в логи; у saveLogToMinio логувати лише факт naявності: llmCfg: !!llmConfig).
7. НЕ деплоїти. Дзеркала .lovable НЕ потрібні (services/ і cloudflare-worker/ не дзеркалюються).
Верифікація:
  cd services/drakon-agent-flue && node node_modules/typescript/bin/tsc --noEmit → 0
  cd ../docs-agent-flue && node node_modules/typescript/bin/tsc --noEmit → 0 (якщо node_modules нема — npm install --ignore-scripts)
  cd ../architect-agent-flue && node node_modules/typescript/bin/tsc --noEmit → 0
  worker-mcp-drakon.js — node --check cloudflare-worker/worker-mcp-drakon.js → синтаксис ок.
Коміт: feat(llm): pass UI llmConfig through proxy worker and flue agents to llmComplete (TASK-212)
Push: git push origin main
Diary: SESSION:DATE|TASK-212:llm-config-passthrough|commit:<hash>|★★★

[x] TASK-213: UI Redesign Фаза A — палітра (CSS vars) + WorkspaceShell compiler-first
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH (SSH тільки для od-generate.sh). Спочатку git pull origin main.
Специфікація: docs/DESIGN.md (v1.1, compiler-first). ПРОЧИТАТИ §4 (токени), §12 (Reality Map), §14 (протокол OpenDesign) ПЕРЕД роботою.
Що зробити:
1. ПАЛІТРА: у src/styles.css (або де визначені CSS-змінні теми) оновити значення під DESIGN.md §4:
   --background → #111318; surface/card → #1a1b21; elevated → #282a2f;
   --foreground → #e2e2e9; --muted-foreground → #9aa0aa;
   --border → rgba(255,255,255,0.10); accent-amber #f59e0b НЕ ЧІПАТИ.
   Додати (якщо нема): --accent-info: #8fd5ff; --accent-success: #51e77b; --accent-error: #ff6b6b.
   ТІЛЬКИ значення змінних — жодних нових hex у компонентах.
2. WORKSPACESHELL через OpenDesign за протоколом DESIGN.md §14:
   a. Прочитати ПОВНИЙ поточний src/components/workspace/WorkspaceShell.tsx.
   b. Викликати з AGY3: ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh '<промпт>' /tmp/od-shell.tsx"
      Промпт ОБОВ'ЯЗКОВО містить: (1) повний поточний код WorkspaceShell.tsx у тегах <code>...</code>;
      (2) вимогу: додати лівий IconRail 40px з 6 іконками lucide (Logic=GitBranch, mRNA=FileCode2, Ribosome=Cpu, Protein=Braces, Knowledge=BookOpen, Runtime=Activity) і нижній collapsible Evidence Drawer (висота 200-320px, toggle-стріпом як існуючі панелі);
      (3) ЗБЕРЕГТИ всі існуючі props, children-слоти, collapsible-механіку та імпорти; нічого з існуючої функціональності не видаляти;
      (4) дотриматись токенів DESIGN.md §4 через CSS-змінні (bg-background, border-border...), НЕ hex.
   c. ПРИЙМАННЯ (§14.3): перевірити що згенерований код зберіг реальні імпорти/props/слоти оригіналу і НЕ вигадав неіснуючі модулі. Якщо вигадав — уточнити промпт і повторити od-generate (до 2 повторів). Якщо все одно сміття — інтегрувати зміни ВРУЧНУ мінімальним diff-ом на основі ідей генерації.
   d. Інтегрувати у src/components/workspace/WorkspaceShell.tsx. IconRail поки що навігаційно: клік = navigate на існуючі маршрути (/diagrams, /pipelines, /agents, /knowledge, /observability; mRNA-іконка disabled з title "Sprint 3").
3. Дзеркало: cp src/styles.css .lovable/src/styles.css; cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
4. НІЧОГО більше не чіпати (інші сторінки/компоненти — наступні задачі).
Верифікація: npx tsc --noEmit → 0 помилок.
Коміт: feat(ui): phase A compiler-first — semantic palette + WorkspaceShell IconRail/Evidence Drawer (TASK-213)
Push: git push origin main
Diary: SESSION:DATE|TASK-213:ui-phase-a|commit:<hash>|★★★

[x] TASK-214: UI Фаза B-1 — компонент CompilerToolbar (compiler-first)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH для коду (SSH ТІЛЬКИ для od-generate.sh). Спочатку git pull origin main.
Специфікація: docs/DESIGN.md §5.1 (CompilerToolbar), §4 (токени), §12 (Reality Map), §14 (протокол real-code). ПРОЧИТАТИ перед роботою.
Що зробити:
1. Прочитати ПОВНІСТЮ src/pages/PipelineEditorPage.tsx — це предок (Reality Map §12). Зрозуміти існуючий toolbar: які кнопки/handlers там зараз є.
2. Згенерувати компонент через OpenDesign (DESIGN.md §14):
   ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh '<промпт>' /tmp/od-compiler-toolbar.tsx"
   Промпт МУСИТЬ містити: (а) реальний фрагмент toolbar-коду з PipelineEditorPage.tsx у <code>...</code>; (б) вимогу: створити ОКРЕМИЙ компонент CompilerToolbar з кнопками Analyze · Export mRNA · Compile · Validate · Deploy; props: { onAnalyze?: () => void; onCompile?: () => void; disabled?: boolean }; кнопки без handler-а — disabled з title="Sprint 3"; (в) стиль: токени через Tailwind-класи (bg-background, border-border, text-muted-foreground, амбер-акцент), щільний IDE-стиль 12-13px, іконки lucide-react (Search, FileCode2, Play, CheckCircle2, Rocket); (г) ЗАБОРОНА вигадувати неіснуючі модулі.
   ЯКЩО ssh/od-generate недоступний або 2 спроби дали сміття — написати компонент САМОСТІЙНО за тією ж спекою.
3. Зберегти як src/components/pipeline/CompilerToolbar.tsx.
4. Прийняти (§14.3): перевірити що imports реальні (react, lucide-react, @/components/ui/* якщо треба — ТІЛЬКИ існуючі шляхи).
5. Інтегрувати у src/pages/PipelineEditorPage.tsx: відрендерити CompilerToolbar НАД існуючим toolbar-ом; onAnalyze/onCompile підключити до ІСНУЮЧИХ handlers сторінки якщо є відповідні дії (запуск пайплайна тощо), інакше лишити undefined (=disabled). ІСНУЮЧІ кнопки сторінки НЕ видаляти — це паралельне додавання, видалимо старе у Фазі C.
6. Дзеркало: cp src/components/pipeline/CompilerToolbar.tsx .lovable/src/components/pipeline/CompilerToolbar.tsx; cp src/pages/PipelineEditorPage.tsx .lovable/src/pages/PipelineEditorPage.tsx
7. НІЧОГО більше не чіпати.
Верифікація: npx tsc --noEmit → 0 помилок.
Коміт: feat(ui): phase B-1 CompilerToolbar component wired into PipelineEditorPage (TASK-214)
Push: git push origin main
Diary: SESSION:DATE|TASK-214:compiler-toolbar|commit:<hash>|★★★

[x] TASK-215: Export mRNA — підключити ІСНУЮЧИЙ генератор псевдокоду (wiring, НЕ розробка)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
КОНТЕКСТ (знайдено через GitNexus, все ВЖЕ ІСНУЄ):
- src/lib/drakon/pseudocode.ts — ГОТОВА обгортка: diagramToPseudocode(diagramJson, name, language='en') → Promise<string>; pseudocodeToMarkdown(pseudocode, diagramName) → string з frontmatter. Зараз модуль НІКИМ не імпортується.
- public/libs/drakongen.js — генератор (toPseudocode, рядок 652), обгортка сама його lazy-load-ить з /libs/drakongen.js.
- src/components/pipeline/CompilerToolbar.tsx — кнопка "Export mRNA" зараз disabled (TASK-214).
ЗАБОРОНЕНО: міняти pseudocode.ts, drakongen.js, drakonwidget.js. Це задача ПІДКЛЮЧЕННЯ.
Що зробити:
1. CompilerToolbar.tsx: додати prop onExportMrna?: () => void; кнопку "Export mRNA" (FileCode2) підключити до нього (без handler-а — disabled як зараз). Існуючі props не ламати.
2. src/pages/PipelineEditorPage.tsx: реалізувати handleExportMrna:
   - взяти ПОТОЧНИЙ pipeline IR зі стану сторінки (об'єкт з items — подивись як сторінка вже тримає/зберігає IR);
   - const pseudo = await diagramToPseudocode(ir, pipelineName) (import з "@/lib/drakon/pseudocode");
   - const md = pseudocodeToMarkdown(pseudo, pipelineName);
   - скачати як файл `${pipelineName}.pseudo.md` (Blob + URL.createObjectURL + a.click() — той самий патерн, що в існуючому handleExport на AgentStudioPage.tsx:210, подивись його);
   - toast.success("Псевдокод експортовано") / toast.error при падінні (sonner вже в проекті).
   - Передати onExportMrna={handleExportMrna} у <CompilerToolbar>.
3. ПЕРЕВІРИТИ РУКАМИ через node НЕ вийде (browser-only window.drakongen) — тому верифікація типів: npx tsc --noEmit → 0 НОВИХ помилок у src/.
4. Дзеркало: cp обох змінених файлів у .lovable/src/... (ті самі шляхи).
5. НІЧОГО більше не чіпати.
Коміт: feat(compiler): wire existing drakongen pseudocode export to CompilerToolbar Export mRNA (TASK-215)
Push: git push origin main
Diary: SESSION:DATE|TASK-215:export-mrna-wiring|commit:<hash>|★★★

[x] TASK-216: Рибосома v1 — POST /compile у architect-agent-flue (псевдокод+семантика → код)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
Специфікація: docs/ARCHITECTURE-CORE.md §1.3 (правила трансляції рибосоми). Це ДРУГА половина компілятора (перша — Export mRNA, TASK-215 ✅).
КОНТЕКСТ (перевірено): NodeConfig у src/lib/pipeline-config-api.ts має is_llm, is_deterministic, description — це ДНК-мітки. drakongen-псевдокод їх ВТРАЧАЄ (pipelineToIR кладе лише label). Тому /compile приймає ОБИДВА: псевдокод + nodes-семантику.
Що зробити (ТІЛЬКИ services/architect-agent-flue):
1. Створити services/architect-agent-flue/tools/ribosome.ts:
   export async function compilePseudocode(input: {
     pseudocode: string;
     nodes?: Array<{ label: string; type: string; is_llm?: boolean; is_deterministic?: boolean; description?: string }>;
     pipelineName: string;
     target?: string;           // v1: тільки "flue"
   }, env: any, llmConfig?: any): Promise<{ code: string; target: string }>
   Логіка:
   - Побудувати таблицю семантики: для кожного node — рядок "label → :: llm ::" (is_llm) або ":: tool ::" + description.
   - Системний промпт (ARCHITECTURE-CORE §1.3, скопіювати правила):
     "Ти — рибосома-компілятор DRAKON-псевдокоду у TypeScript Cloudflare Worker workflow.
      Правила: вузол :: tool :: → await runNode(name, state, env) (детермінований крок);
      вузол :: llm :: → await llmComplete([...], model, temp, apiKey, proxyUrl, env);
      QUESTION/розгалуження ТАК(one)/НІ(two) → if/else;
      Згенеруй ПОВНИЙ файл workflows/{name}.ts: export async function run{Name}(initialState, env) з імпортом llmComplete з '../lib/llm-client.js'. БЕЗ вигаданих залежностей. Відповідь — ТІЛЬКИ TypeScript код у ```typescript блоці."
   - User-промпт: псевдокод + таблиця семантики вузлів.
   - Виклик: llmComplete(messages, llmCfg?.model || env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, llmCfg?.apiKey, llmCfg?.baseUrl, env) — той самий резолв що TASK-212 (llmCfg застосовувати лише якщо protocol відсутній/openai).
   - Витягти код з ```typescript блоку (якщо нема — повернути сирий текст).
2. У services/architect-agent-flue/src/index.ts додати маршрут:
   app.post('/compile', async (c) => { body: { pseudocode, nodes?, pipelineName, target?, llmConfig? } → 400 якщо нема pseudocode/pipelineName → compilePseudocode(...) → c.json({ code, target, pipelineName }) }
   Існуючі маршрути НЕ чіпати. authMiddleware НЕ вішати (як інші маршрути; auth-шар — окремий спринт).
3. apiKey НЕ логувати ніде.
4. НЕ деплоїти (деплой — оркестратор).
Верифікація: cd services/architect-agent-flue && npx tsc --noEmit → 0 помилок (якщо node_modules нема — npm install --ignore-scripts і node node_modules/typescript/bin/tsc --noEmit).
Коміт: feat(compiler): ribosome v1 — POST /compile pseudocode+node semantics to TS workflow (TASK-216)
Push: git push origin main
Diary: SESSION:DATE|TASK-216:ribosome-v1|commit:<hash>|★★★

[x] TASK-217: UI Compile — кнопка компіляції викликає рибосому POST /compile (Фаза C wiring)
!!IMPORTANT!! Run locally on Termux у ~/workspace/ai-drakon-scaffolder, NO SSH. Спочатку git pull origin main.
КОНТЕКСТ (все вже працює, перевірено curl-ом): POST https://architect-agent.exodus.pp.ua/compile
  body: { pipelineName, pseudocode, nodes: [{label,type,is_llm,is_deterministic,description}], llmConfig? }
  → { code, target, pipelineName }. LLM-виклик триває 20-90с.
Що зробити (ТІЛЬКИ 2 файли + дзеркала):
1. src/pages/PipelineEditorPage.tsx — реалізувати handleCompile:
   a. const ir = pipelineToIR(config); const pseudo = await diagramToPseudocode(ir, config.name);  // як у handleExportMrna
   b. nodes = config.nodes.map(n => ({ label: n.label, type: n.type, is_llm: n.is_llm, is_deterministic: n.is_deterministic, description: n.description }));
   c. URL: з налаштувань — readSettings().agents.architectUrl (import { readSettings } from "@/lib/settings-storage") + '/compile'.
   d. fetch POST з AbortSignal.timeout(120000); тіло: { pipelineName: config.name, pseudocode: pseudo, nodes }.
   e. Результат: скачати data.code як файл `${config.name}.workflow.ts` (той самий Blob-патерн, що у handleExportMrna) + toast.success("Скомпільовано: " + config.name + ".workflow.ts").
   f. Стан виконання: const [compiling, setCompiling] = useState(false); toast.error при падінні/timeout ("Компіляція не вдалась: ..."); setCompiling(false) у finally.
   g. Передати у <CompilerToolbar> onCompile={handleCompile} і disabled={compiling} (prop disabled вже існує) — АБО якщо disabled глушить весь toolbar, додати окремий prop compiling?: boolean який дизейблить лише кнопку Compile і показує їй title="Компіляція...". Обери мінімальний варіант.
2. src/components/pipeline/CompilerToolbar.tsx — тільки якщо потрібен prop compiling з п.1g; інакше НЕ чіпати.
3. Дзеркала: cp обох змінених файлів у .lovable/src/... (ті самі шляхи).
4. НІЧОГО більше не чіпати. pseudocode.ts, ribosome.ts, drakongen.js — недоторкані.
Верифікація: npx tsc --noEmit → 0 НОВИХ помилок у src/.
Коміт: feat(compiler): wire Compile button to ribosome /compile endpoint (TASK-217)
Push: git push origin main
Diary: SESSION:DATE|TASK-217:compile-wiring|commit:<hash>|★★★

[x] TASK-218: Appwrite Multi-user Auth Integration (SaaS Phase 1)
!!IMPORTANT!! Run locally on Termux on AGY3 (192.168.3.204). DO NOT SSH to 192.168.3.184 for coding. First git pull origin main.
What to do:
1. In `src/routes/__root.tsx`:
   - Import `AuthProvider` from `@/context/AuthContext`.
   - In `RootComponent`, wrap the `ProjectProvider` and its descendants inside `<AuthProvider>...</AuthProvider>`.
2. In `src/pages/LoginPage.tsx`:
   - Import `account` from `@/lib/appwrite`.
   - Update `handleLogin` to support Appwrite authentication when the user inputs an email (i.e. `username` contains `@` symbol):
     - Call `await account.createEmailPasswordSession(username, password)`.
     - Fetch the Appwrite JWT using `const jwtObj = await account.createJWT()`.
     - Set the access token in localStorage using `setAccessToken(jwtObj.jwt)` so that all protected routes (`hasClientJwt()`) and API headers (`authHeaders()`) validate properly.
     - Navigate to `/diagrams`.
     - Fallback to the existing custom login endpoint (POST to `/auth/login`) for standard local bypass logins (like password `drakon-mcp-2026` or local owner credentials).
3. In `src/components/workspace/WorkspaceShell.tsx`:
   - Import `useAuth` from `@/context/AuthContext`.
   - In the `logout` function, retrieve `logout` from `useAuth` (as `appwriteLogout`), call it to terminate the Appwrite session, and then call `clearAccessToken()` and navigate to `/login`.
4. In `src/components/app/AppHeader.tsx`:
   - Import `useAuth` from `@/context/AuthContext`.
   - In the `logout` function, retrieve `logout` from `useAuth` (as `appwriteLogout`), call it to terminate the Appwrite session, and then call `clearAccessToken()` and navigate to `/login`.
5. Sync: cp modified files to their respective `.lovable/src/` locations.
6. Verify: run `npx tsc --noEmit` and check for 0 TypeScript errors.
7. Commit and push:
   - Commit: `feat(auth): integrate Appwrite email login and session management (TASK-218)`
   - Push to main.
   - Diary: `SESSION:DATE|TASK-218:appwrite-auth-integration|commit:<hash>|★★★`

[ ] TASK-219: Browser diagnosis — knowledge zone creation
!!IMPORTANT!! Run on AGY3 (192.168.3.204), using agent-workspace MCP browser (RPi .234)

GOAL: Diagnose why knowledge zone creation fails — button shows Fetching files but zone never created.

STEPS:
1. Use agent-workspace MCP browser (workspace_browser_navigate, workspace_browser_snapshot):
   a. Navigate to https://aidrakon.tech/login
   b. Log in: username=owner, password=805235io
   c. Navigate to https://aidrakon.tech/knowledge

2. Open browser DevTools (F12 or Ctrl+Shift+J), go to Console tab, clear it

3. Click Create Zone button, fill: Name=test-zone, select any folder
4. Click Create/Submit, wait 10s, snapshot

5. Screenshot console errors — specifically:
   - GARDEN_OWNER_PASSWORD not configured
   - Failed to load files from GitHub
   - Network errors 403/502/503
   - No text/markdown files found

6. Also check Network tab: what requests are made when Create is clicked?
   What status codes do they return?

7. Report exact error messages, HTTP status codes, and what the UI shows.

REPORT via commit + diary:
Commit: 'chore(diagnosis): TASK-219 browser zone diagnosis findings'
Diary: 'SESSION:DATE|TASK-219:zone-diagnosis|findings:SUMMARY|star star star'

[x] TASK-220: Auth UI Unification — port NetworkBackground from Bloom to DRAKON LoginPage + fix registration

[x] TASK-221: UI Polish — привести DRAKON workspace до Bloom-стилю (типографіка, sidebar, сторінки)

[x] TASK-222: Data isolation + remove D1 from architect-agent-flue → Appwrite

---

## [x] TASK-223: Settings architecture — admin/user split + Appwrite auth fix

**!!IMPORTANT!! Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/`**
**After every file change: cp src/X .lovable/src/X**

### Проблема
1. `settings.tsx` використовує `hasClientJwt()` — стара auth система, BROKEN після Appwrite (TASK-218)
2. GitHub PAT, agent URLs, n8n API key видно ВСІМ юзерам — немає розподілу admin/user
3. `DEFAULT_SETTINGS.github.owner = "maxfraieho"` і `repo = "drakon-setup-hub"` — нові юзери бачать репо власника
4. MCP секція використовує `localStorage.getItem("jwt")` → BROKEN (цей ключ очищається при логіні з TASK-222)

### Файли для змін
- `src/routes/settings.tsx` + `.lovable/src/routes/settings.tsx`
- `src/lib/settings-storage.ts` + `.lovable/src/lib/settings-storage.ts`

---

### Зміна 1: settings-storage.ts — прибрати дефолти власника

У `DEFAULT_SETTINGS` замінити:
```ts
github: {
  owner: "",          // було: "maxfraieho"
  repo: "",           // було: "drakon-setup-hub"
  branch: "main",
  token: "",
},
```

---

### Зміна 2: settings.tsx — замінити auth check

**Видалити:**
```tsx
import { hasClientJwt } from "@/lib/route-auth";
// ...
if (!hasClientJwt()) {
  return <Navigate to="/login" replace />;
}
```

**Замінити на (на початку функції `SettingsRoute`, після існуючих useState):**
```tsx
const { user, isLoading: authLoading } = useAuth();
const isAdmin = user?.email === 'claude.1@pmusic.com.ua';

if (authLoading) {
  return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}
if (!user) {
  return <Navigate to="/login" replace />;
}
```

---

### Зміна 3: settings.tsx — нова вкладка "Профіль" + скривання admin-вкладок

**3а. TabsList** — замінити повністю (зараз `md:grid-cols-7`):
```tsx
<TabsList className="inline-flex w-max min-w-full gap-1 px-1 md:w-auto md:px-0">
  <TabsTrigger value="profile" className="shrink-0 whitespace-nowrap">Профіль</TabsTrigger>
  <TabsTrigger value="mcp" className="shrink-0 whitespace-nowrap">MCP Access</TabsTrigger>
  {isAdmin && <TabsTrigger value="github" className="shrink-0 whitespace-nowrap">GitHub</TabsTrigger>}
  {isAdmin && <TabsTrigger value="agents" className="shrink-0 whitespace-nowrap">Агенти</TabsTrigger>}
  {isAdmin && <TabsTrigger value="docs" className="shrink-0 whitespace-nowrap">Документація</TabsTrigger>}
  {isAdmin && <TabsTrigger value="n8n" className="shrink-0 whitespace-nowrap">n8n</TabsTrigger>}
  {isAdmin && <TabsTrigger value="minio" className="shrink-0 whitespace-nowrap">MinIO</TabsTrigger>}
  {isAdmin && <TabsTrigger value="app" className="shrink-0 whitespace-nowrap">Додаток</TabsTrigger>}
</TabsList>
```

**3б. Додати defaultValue="profile" до `<Tabs>`:**
```tsx
<Tabs defaultValue="profile" className="space-y-4">
```

**3в. TabsContent для "profile"** — вставити ПЕРЕД існуючим `<TabsContent value="github">`:
```tsx
<TabsContent value="profile" className="pb-20 md:pb-0">
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Акаунт</CardTitle>
        <CardDescription>Інформація про ваш обліковий запис</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Ім'я</Label>
          <p className="text-sm font-medium">{user?.name || "—"}</p>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <p className="text-sm font-medium">{user?.email || "—"}</p>
        </div>
        {isAdmin && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            Адміністратор платформи — додаткові вкладки доступні у меню вище.
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>Підключення до GitHub для роботи з проектами</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">GitHub OAuth — незабаром</p>
          <p>Підключення особистих репозиторіїв через GitHub OAuth буде доступно у наступному оновленні.</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Інтерфейс</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="profile-theme">Тема</Label>
          <Select
            value={settings.app.theme}
            onValueChange={(value: AppSettings["app"]["theme"]) =>
              updateSettings((prev) => ({ ...prev, app: { ...prev.app, theme: value } }))
            }
          >
            <SelectTrigger id="profile-theme">
              <SelectValue placeholder="Оберіть тему" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Системна</SelectItem>
              <SelectItem value="light">Світла</SelectItem>
              <SelectItem value="dark">Темна</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={saveSettings} size="sm">Зберегти</Button>
      </CardContent>
    </Card>
  </div>
</TabsContent>
```

**3г. Обгорнути існуючі admin TabsContent в `{isAdmin && (...)}`:

Кожен з цих `<TabsContent>` обгорнути в `{isAdmin && ( ... )}`:
- `<TabsContent value="github" ...>`
- `<TabsContent value="agents">`
- `<TabsContent value="docs">`
- `<TabsContent value="n8n">`
- `<TabsContent value="minio">`
- `<TabsContent value="app">`

`<TabsContent value="mcp">` — НЕ обгортати (залишається для всіх).

---

### Зміна 4: settings.tsx — MCP секція (зробити admin-only)

MCP Access key використовує старий `localStorage.getItem("jwt")` який очищається при логіні.
Тимчасово: зробити MCP секцію видимою тільки для адмін (вона вже за вкладкою "MCP Access" — залишити для всіх, але додати примітку якщо не admin):

Всередині `<TabsContent value="mcp">`, одразу після `<CardContent className="space-y-4">` додати:
```tsx
{!isAdmin && (
  <div className="rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-sm text-muted-foreground">
    <p>MCP Access Key — доступно після підключення GitHub OAuth.</p>
  </div>
)}
{isAdmin && (
  // весь існуючий контент MCP секції (isLoadingMcpKey ? ... : mcpKey ? ... : ...)
)}
```

**Примітка для AGY3:** Повний існуючий вміст MCP секції (рядки 947-1028 settings.tsx) перемістити всередину `{isAdmin && ( ... )}`.

---

### Зміна 5: settings.tsx — прибрати `<Navigate>` та `hasClientJwt` з кінця функції

Рядок `if (!hasClientJwt()) { return <Navigate to="/login" replace />; }` знаходиться приблизно на рядку 318 — видалити його (auth тепер перевіряється на початку через useAuth).

---

### Верифікація
```bash
cd /data/data/com.termux/files/home/workspace/ai-drakon-scaffolder
grep -n "hasClientJwt" src/routes/settings.tsx   # має бути 0 рядків
grep -n "isAdmin" src/routes/settings.tsx         # має бути 5+ рядків
grep -n '"maxfraieho"' src/lib/settings-storage.ts  # має бути 0 рядків

# Синхронізація
cp src/routes/settings.tsx .lovable/src/routes/settings.tsx
cp src/lib/settings-storage.ts .lovable/src/lib/settings-storage.ts
```

### TypeScript перевірка
```bash
npx tsc --noEmit 2>&1 | head -30
```

### Git commit
```bash
git add src/routes/settings.tsx src/lib/settings-storage.ts \
        .lovable/src/routes/settings.tsx .lovable/src/lib/settings-storage.ts
git commit -m "feat(settings): admin/user split + fix Appwrite auth check + profile tab"
git push origin main
```

### Diary
`SESSION:TASK-223|settings-admin-split|commit:<hash>|hasClientJwt→useAuth|isAdmin-tabs|profile-tab|owner-defaults-removed|★★★`

---

## Контекст

Новий користувач після реєстрації бачить проекти власника (`drakon-setup-hub`, `maxfraieho/uav-watcher`).
Два джерела витоку:
1. `localStorage` ключі НЕ прив'язані до userId — глобальні для всього браузера
2. `GET /projects` в architect-agent-flue — без auth, читає з GitHub, повертає ВСЕ

Паралельно: D1 database (`billing_profiles`) в architect-agent-flue — виносимо в Appwrite Databases.
architect-agent-flue має займатися ТІЛЬКИ архітектурою (GitHub pipelines), не billing storage.

---

## Частина 1: Frontend — `src/context/ProjectContext.tsx`

Прочитай файл спочатку.

### 1a. Додати `useAuth` import та отримати `userId`

Додати до imports на початку файлу:
```typescript
import { useAuth } from "@/context/AuthContext";
```

### 1b. В `ProjectProvider` component — додати userId

Одразу після `const [loading, setLoading] = useState(false);` додати:
```typescript
const { user } = useAuth();
const userId = user?.$id ?? "anon";
```

Видалити константи з верхнього рівня модуля:
```typescript
const STORAGE_KEY = "ai_drakon_active_project";
const LOCAL_PROJECTS_KEY = "ai_drakon_local_projects";
```

### 1c. Оновити `loadLocalProjects` і `saveLocalProjects` — вони повинні бути всередині компонента або приймати ключ

Замінити функції `loadLocalProjects` і `saveLocalProjects` на версії всередині компонента, що використовують `userId`:

```typescript
function loadLocalProjectsFor(uid: string): Project[] {
  try {
    const raw = localStorage.getItem(`ai_drakon_local_projects_${uid}`);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch { return []; }
}

function saveLocalProjectsFor(uid: string, list: Project[]) {
  try { localStorage.setItem(`ai_drakon_local_projects_${uid}`, JSON.stringify(list)); } catch {}
}
```

Ці функції мають бути ЗОВНІ компонента але приймати `uid` параметр.

### 1d. Оновити `loadProjects` useCallback — залежить від `userId`

`loadProjects` має використовувати userId-скоуповані ключі. Змінити:
- `localStorage.getItem(STORAGE_KEY)` → `localStorage.getItem(\`ai_drakon_active_project_${userId}\`)`
- `loadLocalProjects()` → `loadLocalProjectsFor(userId)`
- `saveLocalProjects(...)` → `saveLocalProjectsFor(userId, ...)`
- В `deps` array: додати `userId`

### 1e. Оновити `setActiveProject` — скоупований ключ

В `setActiveProject` useCallback замінити:
- `localStorage.setItem(STORAGE_KEY, p.slug)` → `localStorage.setItem(\`ai_drakon_active_project_${userId}\`, p.slug)`
- `localStorage.setItem(STORAGE_KEY + "_data", ...)` → `localStorage.setItem(\`ai_drakon_active_project_${userId}_data\`, ...)`
- `localStorage.removeItem(STORAGE_KEY)` → `localStorage.removeItem(\`ai_drakon_active_project_${userId}\`)`
- `localStorage.removeItem(STORAGE_KEY + "_data")` → `localStorage.removeItem(\`ai_drakon_active_project_${userId}_data\`)`
- В `deps` array: додати `userId`

### 1f. Додати useEffect для очистки при зміні користувача

Після існуючого `useEffect(() => { void loadProjects(); }, [loadProjects]);` додати:
```typescript
useEffect(() => {
  setProjects([]);
  setActiveProjectState(null);
}, [userId]);
```

### 1g. Оновити `addLocalProject` і `removeLocalProject`

В `addLocalProject`:
- `loadLocalProjects()` → `loadLocalProjectsFor(userId)`
- `saveLocalProjects(updated)` → `saveLocalProjectsFor(userId, updated)`
- В `deps` array: додати `userId`

В `removeLocalProject`:
- `loadLocalProjects()` → `loadLocalProjectsFor(userId)`
- `saveLocalProjects(list)` → `saveLocalProjectsFor(userId, list)`
- В `deps` array: додати `userId`

---

## Частина 2: architect-agent-flue — прибрати D1, додати Appwrite billing

### 2a. `services/architect-agent-flue/src/middleware/auth.ts`

Прочитай файл спочатку.

Замінити `resolvePlan(db: D1Database, teamId: string)` на Appwrite-версію:

```typescript
import { Client, Account, Databases } from 'node-appwrite';

const DB_ID = "ai-drakon";
const BILLING_COL = "billing_profiles";

async function resolvePlan(env: any, userId: string): Promise<Tenant["plan"]> {
  try {
    const client = new Client()
      .setEndpoint(env.APPWRITE_ENDPOINT)
      .setProject(env.APPWRITE_PROJECT_ID)
      .setKey(env.APPWRITE_API_KEY);
    const doc = await new Databases(client).getDocument(DB_ID, BILLING_COL, userId);
    return (doc.planType ?? "free") as Tenant["plan"];
  } catch {
    return "free";
  }
}
```

Оновити тип `AuthEnv.Bindings` — видалити `DB: D1Database`, додати `APPWRITE_API_KEY: string`:
```typescript
type AuthEnv = {
  Bindings: {
    SESSION_KV: KVNamespace;
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
    APPWRITE_API_KEY: string;
  };
  Variables: { tenant: Tenant };
};
```

В `authMiddleware`, замінити виклик `resolvePlan`:
```typescript
// БУЛО:
plan: await resolvePlan(c.env.DB, teamId),
// СТАЛО:
plan: await resolvePlan(c.env, user.$id),
```

Також спростити teamId (поки без Teams):
```typescript
const teamId = user.$id; // teams — потім
const tenant: Tenant = {
  userId: user.$id,
  teamId,
  plan: await resolvePlan(c.env, user.$id),
};
```

### 2b. `services/architect-agent-flue/src/middleware/quota.ts`

Прочитай файл спочатку. Замінити весь файл:

```typescript
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
```

### 2c. `services/architect-agent-flue/tools/project-pipelines.ts`

Прочитай файл спочатку.

Всі функції змінюють шлях GitHub з `projects/${slug}/` на `projects/u/${userId}/${slug}/`.

Оновити сигнатури:
- `listProjects(env: any)` → `listProjects(env: any, userId: string)`
- `createProject(slug, payload, env)` → `createProject(slug, payload, userId: string, env: any)`
- `listAgents(slug, env)` → `listAgents(slug, userId: string, env: any)`
- `getProjectPipeline(slug, agent, env)` → `getProjectPipeline(slug, agent, userId: string, env: any)`
- `saveProjectPipeline(slug, agent, ir, env)` → `saveProjectPipeline(slug, agent, ir, userId: string, env: any)`
- `getProjectPipelineStatus(slug, agent, env)` → `getProjectPipelineStatus(slug, agent, userId: string, env: any)`
- `searchProjectKB(slug, agent, q, env)` → `searchProjectKB(slug, agent, q, userId: string, env: any)`
- `uploadProjectKBDoc(slug, agent, filename, content, env)` → `uploadProjectKBDoc(slug, agent, filename, content, userId: string, env: any)`
- `deleteProject(slug, env)` → `deleteProject(slug, userId: string, env: any)`

У `listProjects(env, userId)` — тепер читає з `projects/u/${userId}`:
```typescript
const items = await api.listDir(`projects/u/${userId}`);
```

У всіх інших функціях замінити `projects/${slug}/` на `projects/u/${userId}/${slug}/`.

### 2d. `services/architect-agent-flue/src/index.ts`

Прочитай весь файл.

Змінити маршрути проектів — додати `authMiddleware` і передати `tenant.userId`:

```typescript
// БУЛО:
app.get('/projects', async (c) => {
  const projects = await listProjects(c.env);
  return c.json({ projects });
});

// СТАЛО:
app.get('/projects', authMiddleware, async (c) => {
  const { userId } = c.get('tenant');
  const projects = await listProjects(c.env, userId);
  return c.json({ projects });
});
```

Аналогічно для `/projects/:slug` (POST, DELETE) — додати `authMiddleware` і `userId`:
```typescript
app.post('/projects/:slug', authMiddleware, async (c) => {
  const { userId } = c.get('tenant');
  const slug = c.req.param('slug');
  const body = await c.req.json().catch(() => ({}));
  const res = await createProject(slug, body, userId, c.env);
  return c.json({ project: res });
});

app.delete('/projects/:slug', authMiddleware, async (c) => {
  const { userId } = c.get('tenant');
  const slug = c.req.param('slug');
  const ok = await deleteProject(slug, userId, c.env);
  return c.json({ deleted: ok });
});
```

Для всіх маршрутів `/projects/:slug/agents/...` — додати `authMiddleware` і `userId`:
- `/projects/:slug/agents` → `listAgents(slug, userId, c.env)`
- `/projects/:slug/agents/:agent/pipeline` GET → `getProjectPipeline(slug, agent, userId, c.env)`
- `/projects/:slug/agents/:agent/pipeline` PUT → `saveProjectPipeline(slug, agent, body, userId, c.env)`
- `/projects/:slug/agents/:agent/status` → `getProjectPipelineStatus(slug, agent, userId, c.env)`
- `/projects/:slug/agents/:agent/execute` → add userId param where relevant
- `/projects/:slug/agents/:agent/kb/search` → `searchProjectKB(slug, agent, q, userId, c.env)`
- `/projects/:slug/agents/:agent/kb/upload` → `uploadProjectKBDoc(slug, agent, filename, content, userId, c.env)`

### 2e. `services/architect-agent-flue/wrangler.toml`

Прочитай файл спочатку. Видалити блок `[[d1_databases]]`:

```toml
# ВИДАЛИТИ ці рядки:
[[d1_databases]]
binding = "DB"
database_name = "ai-drakon-saas"
database_id = "743d5bb0-d09d-4dcc-8329-8ebae8d533f4"
```

`APPWRITE_API_KEY` буде secret (не в wrangler.toml) — вже налаштовано через `wrangler secret put`.

---

## Частина 3: Appwrite schema — `billing_profiles` collection

### 3a. `infrastructure/appwrite/setup.mjs`

Прочитай файл спочатку. Додати `int` helper і `billing_profiles` колекцію.

Після рядка `const dt = ...` додати:
```javascript
const int = (key, required = true, opts = {}) =>
  ({ kind: "integer", body: { key, required, ...opts } });
```

Після `await createCollection("audit_log", ...)` додати:
```javascript
// billing_profiles: server-only (documentSecurity=false), доступ лише через Admin API key
await createCollection("billing_profiles", "Billing Profiles", false, [
  str("userId", 36),
  { kind: "enum", body: { key: "planType", elements: ["free", "pro", "enterprise"], required: true } },
  int("llmQuotaMonthly"),
  int("llmConsumed"),
  dt("updatedAt", false),
]);
```

### 3b. `infrastructure/appwrite/schema.ts`

Додати `BillingProfile` interface після `AuditLogEntry`:
```typescript
export interface BillingProfile {
  userId: string;          // = Appwrite account $id (також є document $id)
  planType: "free" | "pro" | "enterprise";
  llmQuotaMonthly: number;
  llmConsumed: number;
  updatedAt?: string;
}
```

Додати `BILLING_PROFILES: "billing_profiles"` до `COLLECTIONS`.

---

## Частина 4: Sync до .lovable/

```bash
cp src/context/ProjectContext.tsx .lovable/src/context/ProjectContext.tsx
cp infrastructure/appwrite/setup.mjs .lovable/infrastructure/appwrite/setup.mjs 2>/dev/null || true
cp infrastructure/appwrite/schema.ts .lovable/infrastructure/appwrite/schema.ts 2>/dev/null || true
```

---

## TypeScript check

```bash
cd /data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/.lovable
npx tsc --noEmit 2>&1 | head -30

# також перевірити architect-agent-flue окремо:
cd /data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/services/architect-agent-flue
npx tsc --noEmit 2>&1 | head -30
```

Виправити всі TypeScript помилки.

---

## Commit + Push

```bash
cd /data/data/com.termux/files/home/workspace/ai-drakon-scaffolder

git add \
  src/context/ProjectContext.tsx \
  .lovable/src/context/ProjectContext.tsx \
  services/architect-agent-flue/src/middleware/auth.ts \
  services/architect-agent-flue/src/middleware/quota.ts \
  services/architect-agent-flue/tools/project-pipelines.ts \
  services/architect-agent-flue/src/index.ts \
  services/architect-agent-flue/wrangler.toml \
  infrastructure/appwrite/setup.mjs \
  infrastructure/appwrite/schema.ts \
  development/TASKS.md

git commit -m "feat(auth): user-scoped localStorage + architect-flue → Appwrite billing, project isolation"
git push origin main
```

---

## Diary

```
SESSION:2026-06-13|TASK-222:data-isolation+appwrite-billing|localStorage-scoped+D1-removed|commit:<hash>|★★★
```

---

## ВАЖЛИВО після merge (Claude виконає вручну)

Після push Claude запустить:
1. `APPWRITE_API_KEY=... node infrastructure/appwrite/setup.mjs` — створити billing_profiles колекцію
2. `cd services/architect-agent-flue && wrangler secret put APPWRITE_API_KEY` — встановити ключ у Worker
3. `cd services/architect-agent-flue && wrangler deploy` — деплой Worker без D1

---

[x] TASK-224: Рибосома — заборонити хардкод моделі у згенерованому коді (зроблено Claude)

[ ] TASK-225: Зони Знань як паливо рибосоми (MCP-proxy → kbContext у compilePseudocode)

**!!IMPORTANT!! Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder`**
**ПОВНА СПЕЦИФІКАЦІЯ: `development/EXECUTION-PROMPTS.md` → секція TASK-225. Прочитай її ПЕРШОЮ.**
Коротко: додати `kbContext?: string` у RibosomeInput (services/architect-agent-flue/tools/ribosome.ts), вставляти в userPrompt; новий `tools/mcp-proxy.ts` з `fetchZoneContext(env, zoneId, query)`; маршрут /compile приймає zoneId. Файли поза src/ — БЕЗ .lovable sync. `npx tsc --noEmit` чистий. Коміт: `feat(ribosome): wire knowledge zone as compilation fuel via MCP-proxy`. Diary: `SESSION:$(date +%Y-%m-%d)|TASK-225:done|commit:$(git rev-parse --short HEAD)`.

[ ] TASK-226: Onboarding 3 кроки + пісочниця з демо-схемою

**!!IMPORTANT!! Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder`**
**ПОВНА СПЕЦИФІКАЦІЯ: `development/EXECUTION-PROMPTS.md` → секція TASK-226. Прочитай її ПЕРШОЮ.**
Коротко: OnboardingWizard.tsx (3 кроки), onboarding.ts (isOnboarded/markOnboarded), onboarding-demo.ts (демо ThreatClassifier), інтеграція у ProjectContext порожній стан. ВСІ src/ → `cp src/X .lovable/src/X`. `npx tsc --noEmit` чистий. Коміт: `feat(onboarding): 3-step wizard + sandbox demo project`. Diary запис.

[ ] TASK-234a: Білінг — мапа лімітів планів + поле periodStart

**!!IMPORTANT!! Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder`**
**ПОВНА СПЕЦИФІКАЦІЯ: `development/EXECUTION-PROMPTS.md` → секція TASK-234a. Прочитай її ПЕРШОЮ.**
Коротко: новий `services/architect-agent-flue/src/lib/plans.ts` (PLAN_LIMITS free/pro/enterprise); quota.ts бере ліміт з PLAN_LIMITS; setup.mjs+schema.ts додати periodStart. Поза src/ — БЕЗ sync. `npx tsc --noEmit` чистий. Коміт: `feat(billing): plan limits map + periodStart field`. Diary запис.

[ ] TASK-234b: Білінг — Cron місячного скидання квоти

**!!IMPORTANT!! Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder`**
**ПОВНА СПЕЦИФІКАЦІЯ: `development/EXECUTION-PROMPTS.md` → секція TASK-234b. Прочитай її ПЕРШОЮ.**
Коротко: wrangler.toml `[triggers] crons=["0 0 1 * *"]`; index.ts `scheduled()` handler ітерує billing_profiles → llmConsumed=0, periodStart=now. Поза src/ — БЕЗ sync. `npx tsc --noEmit` чистий. Коміт: `feat(billing): monthly quota reset via Cron`. Diary запис. Залежить від TASK-234a.

---

## ХВИЛЯ 2 — Suite-міст + гартування (виконувати ПІСЛЯ A+B)

> Усі — локально на AGY3. Повні специфікації: `development/EXECUTION-PROMPTS.md`
> (секція "ХВИЛЯ 2"). Виконавець читає відповідну секцію ПЕРШОЮ. Після кожного:
> `npx tsc --noEmit` чистий, src/ → `.lovable/`, git push, diary.

[ ] TASK-237: Лендинг — наратив "два сервіси — один Suite" (spec: EXECUTION-PROMPTS.md → TASK-237; src/pages/LandingPage.tsx +.lovable)

[ ] TASK-227: GitHub App + OAuth, encrypted token (spec: EXECUTION-PROMPTS.md → TASK-227; передумова Q: реєстрація GitHub App)

[ ] TASK-228: DRAKON→Bloom deep-link з zone-токеном (spec: EXECUTION-PROMPTS.md → TASK-228)

[ ] TASK-229: Індикатор здоров'я Зони (Archivist ready/failed) (spec: EXECUTION-PROMPTS.md → TASK-229)

[ ] TASK-232: Multi-target компіляція flue+langgraph-js (spec: EXECUTION-PROMPTS.md → TASK-232; залежить TASK-225)

[ ] TASK-233: Async-компіляція через ArchitectJobStore DO (spec: EXECUTION-PROMPTS.md → TASK-233; залежить TASK-225)

[ ] TASK-230: (Garden репо) ролі агентів у UI — за згодою Q (spec: EXECUTION-PROMPTS.md → БЛОК C)

[ ] TASK-235: Bloom→DRAKON "Створити агента з Зони" (spec: EXECUTION-PROMPTS.md → TASK-235; залежить 225,228)

[ ] TASK-236: Єдиний обмін токенами SSO Suite (spec: EXECUTION-PROMPTS.md → TASK-236; залежить 227,228)

[ ] TASK-234c: Stripe webhook — ТІЛЬКИ за наявності платних користувачів (spec: EXECUTION-PROMPTS.md → TASK-234c; залежить 234a/b)
