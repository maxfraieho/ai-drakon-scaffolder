# Claude Code — Серія промптів для наступної фази розробки

Виконуй по порядку. Після кожного кроку роби commit.
Репо: git@github.com:maxfraieho/ai-drakon-setup.git

---

## ПРОМПТ 0 — Підготовка і аудит

```
Клонуй репо і проведи аудит:

git clone git@github.com:maxfraieho/ai-drakon-setup.git
cd ai-drakon-setup

# Запусти тести
npm test -- --run src/lib/htse/__tests__/

# Перевір стан
echo "=== Routes ===" && ls src/routes/
echo "=== HTSE ===" && ls src/lib/htse/
echo "=== Components/htse ===" && ls src/components/htse/ 2>/dev/null

# Перевір TypeScript
npx tsc --noEmit 2>&1 | head -30

Покажи:
1. Результати тестів (очікую 9/9)
2. Список routes
3. TypeScript помилки якщо є
4. Чи є src/components/htse/ValidationPanel.tsx і MutationLogPanel.tsx
5. Чи є src/lib/htse/code-diagram-diff.ts і src/routes/sync.tsx
```

---

## ПРОМПТ 1 — Виправити GitHub file tree (критичний баг)

```
Проблема: GitHub Files сторінка показує "Не вдалося завантажити дерево файлів"
навіть якщо репо публічне. Причина: токен не введено і помилка не пояснюється.

ЗАВДАННЯ:

1. В src/routes/github.tsx знайди де відображається помилка.
   Якщо токен порожній (settings.github.token) → показуй спеціальний banner:

   <div className="...">
     ⚠️ GitHub token не налаштований
     <span>Для доступу до приватних репо потрібен Personal Access Token</span>
     <Button onClick={() => navigate({to: '/settings'})}>
       Додати токен у Налаштування
     </Button>
   </div>

2. Для ПУБЛІЧНИХ репо (без токену) — спробуй завантажити без токену.
   GitHub API дозволяє читати публічні репо без auth (60 req/hour).
   Якщо відповідь 401/403 → показуй banner вище.
   Якщо відповідь 200 → показуй дерево навіть без токену.

3. В src/lib/settings-storage.ts виправ DEFAULT_SETTINGS:
   БУЛО: repo: "drakon-setup-hub"
   СТАЛО: repo: "ai-drakon-setup"
   (актуальний репо проекту)

4. В src/routes/github.tsx виправ default значення:
   БУЛО: repo="drakon-setup-hub"  
   СТАЛО: repo="ai-drakon-setup"

5. Перевір: після змін відкрий /github → має показати дерево
   maxfraieho/ai-drakon-setup без токену (репо публічне).

Після змін:
- npx tsc --noEmit
- git add -A && git commit -m "fix: github file tree - public repos without token + correct default repo"
- git push
```

---

## ПРОМПТ 2 — Додати MinIO вкладку в Settings

```
Додай вкладку "MinIO" в src/routes/settings.tsx між "n8n" і "Додаток".

ЗАВДАННЯ:

1. В src/types/settings.ts додай до AppSettings:
   minio: {
     endpoint: string;    // читається з Worker /health
     bucket: string;
     accessKey: string;
     note: string;        // підказка про Worker Dashboard
   }

2. В src/lib/settings-storage.ts:
   - Додай minio в DEFAULT_SETTINGS з порожніми рядками
   - Додай getMinioConfig(): AppSettings["minio"]

3. В Settings UI додай TabsTrigger "MinIO" і TabsContent:

   <Card>
     <CardHeader>
       <CardTitle>MinIO Storage</CardTitle>
       <CardDescription>
         Параметри S3-сумісного сховища для діаграм.
         Значення зберігаються локально для довідки.
         Для зміни конфігурації — оновіть Worker secrets.
       </CardDescription>
     </CardHeader>
     <CardContent>
       <div className="space-y-3">
         <Label>Endpoint</Label>
         <Input
           value={settings.minio?.endpoint || ""}
           onChange={...}
           placeholder="https://your-minio-host"
         />
         <Label>Bucket</Label>
         <Input value={settings.minio?.bucket || ""} ... />
         <Label>Access Key</Label>
         <Input value={settings.minio?.accessKey || ""} ... />
         
         <Alert>
           <AlertDescription>
             Для зміни параметрів відкрийте:
             <a href="https://dash.cloudflare.com" target="_blank">
               Cloudflare Workers Dashboard
             </a>
             → drakon-mcp-worker → Settings → Variables and Secrets
           </AlertDescription>
         </Alert>
         
         <Button onClick={fetchWorkerHealth} variant="outline">
           Завантажити з Worker
         </Button>
       </div>
     </CardContent>
   </Card>

4. Додай функцію fetchWorkerHealth:
   - GET {workerUrl}/health
   - Парсить response і заповнює minio поля якщо є
   - (Worker /health повинен повертати MINIO_ENDPOINT і MINIO_BUCKET)

5. В Worker cloudflare-worker/worker-mcp-drakon.js знайди /health endpoint
   і додай в response:
   storage: {
     endpoint: env.MINIO_ENDPOINT || "not configured",
     bucket: env.MINIO_BUCKET || "not configured",
     ssl: env.MINIO_USE_SSL || "true"
   }
   (НЕ додавай access key і secret key в /health - security!)

Після змін:
- npx tsc --noEmit
- git add -A && git commit -m "feat: add MinIO tab to Settings + worker health endpoint"
- git push
```

---

## ПРОМПТ 3 — Diagram Change Notification через n8n

```
Реалізуй notification flow: коли людина зберігає схему → 
якщо n8n увімкнено → відправляємо webhook.

ЗАВДАННЯ:

1. Створи src/lib/n8n-client.ts:

import { getN8nConfig } from "@/lib/settings-storage";

export type DiagramChangedPayload = {
  event: "diagram_saved" | "diagram_deleted" | "diagram_created";
  diagramId: string;
  diagramName: string;
  folderId: string;
  timestamp: string;
  changedBy: "human" | "ai";
  mutationsApplied?: number;
  diagramLevel?: string;
};

export async function notifyDiagramChanged(payload: DiagramChangedPayload): Promise<void> {
  const cfg = getN8nConfig();
  if (!cfg.enabled || !cfg.webhookUrl) return;

  try {
    await fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent fail — n8n notification is non-critical
    console.warn("[n8n] Failed to send diagram notification");
  }
}

2. В src/pages/DiagramEditorPage.tsx або де відбувається збереження схеми:
   Після успішного api.saveDiagram → викликай notifyDiagramChanged:

   await notifyDiagramChanged({
     event: "diagram_saved",
     diagramId,
     diagramName: diagram.name,
     folderId,
     timestamp: new Date().toISOString(),
     changedBy: "human",
   });

3. В src/components/htse/MutationLogPanel.tsx (якщо є):
   Після застосування мутацій → також notifyDiagramChanged з changedBy: "ai"

4. В Settings UI (n8n вкладка) додай підказку:
   "Webhook отримає POST з інформацією про зміни схем.
   Приклад n8n workflow: Webhook → Claude API → Log"
   
   І додай приклад payload в accordion/details:
   {
     "event": "diagram_saved",
     "diagramId": "abc123",
     "diagramName": "flow.save-diagram",
     ...
   }

Після змін:
- git add -A && git commit -m "feat: n8n webhook notification on diagram save"
- git push
```

---

## ПРОМПТ 4 — MCP конфігурація для Claude Code

```
Створи конфігураційний файл для підключення Claude Code до MCP Worker.

ЗАВДАННЯ:

1. Створи .mcp.json в корені репо:

{
  "mcpServers": {
    "drakon": {
      "url": "https://drakon-mcp-worker.maxfraieho.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${DRAKON_MCP_API_KEY}"
      }
    }
  }
}

2. Додай в .env.example:
DRAKON_MCP_API_KEY=your-mcp-api-key-here
VITE_WORKER_URL=https://drakon-mcp-worker.maxfraieho.workers.dev

3. Оновити README.md (або створити якщо немає) з секцією:

## Claude Code Integration

### Підключення до DRAKON MCP Server

1. Встанови змінну:
   export DRAKON_MCP_API_KEY=<твій MCP_API_KEY з Worker Dashboard>

2. .mcp.json вже є в репо — Claude Code підхопить автоматично

3. Доступні MCP tools:
   - drakon.listdiagrams — список схем
   - drakon.getdiagram — читати схему
   - drakon.savediagram — зберегти схему
   - drakon.mutatediagram — точкові зміни
   - drakon.validateir — перевірити IR
   - drakon.analyzecodebase — аналіз коду
   - drakon.diffcodevsdiagram — порівняти код і схеми
   - github.listtree — дерево файлів репо
   - github.getfile — вміст файлу
   - github.commitfile — закомітити зміни

4. Перевір що .mcp.json не в .gitignore.
   API KEY зберігається в env, не в файлі.

5. Додай в .gitignore якщо нема:
   .env
   .env.local

Після змін:
- git add .mcp.json .env.example README.md
- git commit -m "feat: add MCP config for Claude Code integration"
- git push
```

---

## ПРОМПТ 5 — Покращення Analysis Flow (реальний GitHub API)

```
Поточна проблема: drakon.analyzecodebase повертає static cache (generated-analysis-cache.js).
Для справжньої роботи з репо потрібен аналіз через GitHub API.

ЗАВДАННЯ:

1. В cloudflare-worker/worker-mcp-drakon.js знайди handleMcpAnalyzeCodebase.

2. Додай новий режим analysis: "github-repo":

async function analyzeGithubRepo(owner, repo, branch, token, paths, env) {
  // Використати github.listtree щоб отримати список файлів
  const treeResult = await handleGithubListTree(
    { owner, repo, branch: branch || "main", path: "" }, env
  );
  
  // Рекурсивно отримати .ts/.tsx файли (max 50)
  const files = [];
  async function collectFiles(entries) {
    for (const entry of entries) {
      if (entry.type === "file" && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(entry);
        if (files.length >= 50) break;
      }
    }
  }
  await collectFiles(treeResult.entries || []);
  
  // Базова евристика без ts-morph (доступна в Worker):
  const summary = {
    totalFiles: files.length,
    totalFunctions: 0,
    totalComponents: 0,
    modules: [...new Set(files.map(f => f.path.split("/")[0]))],
    detectedFlows: [],
    functions: [],
    components: [],
  };
  
  // Для кожного файлу - базовий аналіз через regex
  for (const file of files.slice(0, 20)) {
    const fileResult = await handleGithubGetFile(
      { owner, repo, path: file.path, branch: branch || "main" }, env
    );
    if (!fileResult.success) continue;
    
    const content = fileResult.content || "";
    
    // Count functions
    const funcMatches = content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\()/g) || [];
    summary.totalFunctions += funcMatches.length;
    
    // Detect React components
    const componentMatches = content.match(/(?:export\s+(?:default\s+)?function\s+[A-Z]\w+|const\s+[A-Z]\w+\s*=)/g) || [];
    summary.totalComponents += componentMatches.length;
    componentMatches.forEach(m => {
      const name = m.match(/[A-Z]\w+/)?.[0];
      if (name) summary.components.push({ name, filePath: file.path });
    });
    
    // Detect flows
    if (content.includes("useEffect") || content.includes("useState")) {
      const routeName = file.path.split("/").pop()?.replace(/\.[^.]+$/, "");
      if (routeName) summary.detectedFlows.push(routeName + "-flow");
    }
  }
  
  // PlannedDiagrams евристика
  const plannedDiagrams = summary.components
    .slice(0, 8)
    .map(c => ({
      name: "flow." + c.name.toLowerCase().replace(/[A-Z]/g, m => "-" + m.toLowerCase()),
      description: `Flow diagram for ${c.name} component`,
      scope: "flow",
      estimatedComplexity: "medium",
    }));
  
  return {
    generatedAt: new Date().toISOString(),
    summary,
    plannedDiagrams,
    sourceRepo: `${owner}/${repo}`,
  };
}

3. В handleMcpAnalyzeCodebase: якщо є args.owner і args.repo → 
   використовуй analyzeGithubRepo замість PRE_ANALYZED_ANALYSIS.

4. InputSchema для drakon.analyzecodebase онови:
   - owner: string (optional)
   - repo: string (optional)
   - branch: string (optional, default "main")
   - ... (existing fields)

5. Перевір що github token передається правильно з request headers.

Після змін:
- git add -A
- git commit -m "feat: real GitHub repo analysis in drakon.analyzecodebase"
- git push
- wrangler deploy (на сервері 192.168.3.184)
```

---

## Порядок виконання

| Промпт | Пріоритет | Де виконати | Час |
|--------|-----------|-------------|-----|
| 0 — Аудит | Критичний | Claude Code | 5 хв |
| 1 — GitHub fix | Критичний | Claude Code | 30 хв |
| 2 — MinIO tab | Важливий | Claude Code або Lovable | 1 год |
| 3 — n8n webhook | Важливий | Claude Code | 1 год |
| 4 — MCP config | Важливий | Claude Code | 20 хв |
| 5 — Real analysis | Середній | Claude Code | 2 год |

## Паралельно в Lovable (дизайн)

```
Покращ візуальний дизайн DiagramsPage:
1. Картки схем показують badge з датою + рівень (L0/L1/L2/L3)
2. Grid layout 2 колонки на mobile, 3 на desktop
3. Hover ефект на картках
4. Empty state з красивою ілюстрацією і CTA кнопкою

НЕ чіпати: src/lib/htse/, cloudflare-worker/, логіку API
```
