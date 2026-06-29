# V3 INTEGRATION TASKS

## TASK-V3-P1-B1: Integrate DeterministicPipelineClient into usePipelineExecution.ts

**Виконавець:** AGY rpi3b (Raspberry Pi 3B)  
**Пріоритет:** HIGH  
**Статус:** COMPLETED  

### 📋 Що зробити:
1. Імпортувати `DeterministicPipelineClient` та `DrakonHarnessSpec` з нових модулів:
   ```typescript
   import { DeterministicPipelineClient } from "@/lib/harness/pipeline-client";
   import { createDefaultSpec } from "@/lib/harness/harness-spec";
   ```
2. У хуці `usePipelineExecution` перевіряти feature flag:
   ```typescript
   const useDeterministic = import.meta.env.VITE_USE_DETERMINISTIC === "true";
   ```
3. У методі `runPipeline`:
   - Якщо `useDeterministic === true`, використати `DeterministicPipelineClient` для запуску та полінгу:
     ```typescript
     if (useDeterministic) {
       addLog("info", `Запуск детермінованого пайплайну '${pipelineName}'...`);
       const client = new DeterministicPipelineClient({
         workerBaseUrl: import.meta.env.VITE_WORKER_URL || "https://drakon-antigravity-worker.vokov.workers.dev",
       });
       
       // Для тестування створюємо дефолтний HarnessSpec
       const spec = createDefaultSpec(pipelineName);
       
       // Тут drakonIr має передаватися з нашого store або стану.
       // Для сумісності з поточним методом беремо заглушку або існуючий IR.
       const drakonIr = initialState.drakonIr || {}; 
       
       client.execute(
         drakonIr,
         spec,
         {
           onEvent: (ev) => {
             if (ev.event === "node_start") {
               setActiveNode(ev.node_id);
               addLog("info", `Початок виконання вузла '${ev.node_id}'...`);
             } else if (evt => ev.event === "node_done") {
               setCompletedNodes((prev) => new Set(prev).add(ev.node_id));
               setActiveNode(null);
               addLog("node", `Вузол '${ev.node_id}' успішно виконано.`);
             } else if (ev.event === "breakpoint") {
               setBreakpointNode(ev.node_id);
               setActiveNode(null);
               addLog("warning", `Зупинка на Точці Зупинки у вузлі '${ev.node_id}'.`);
             } else if (ev.event === "gate_blocked") {
               addLog("error", `Блокування Gate [${ev.gate}]: ${ev.reason}`);
             }
           },
           onComplete: (events) => {
             setIsRunning(false);
             setActiveNode(null);
             addLog("success", "Детермінований пайплайн завершив виконання успішно.");
           },
           onError: (err) => {
             setIsRunning(false);
             setActiveNode(null);
             setError(err.message);
             addLog("error", `Помилка виконання: ${err.message}`);
           }
         },
         breakpoints
       );
       return;
     }
     ```
   - Якщо `useDeterministic === false`, залишити поточний SSE stream до FastAPI.
4. Перевірити збірку проекту:
   `npx -y -p typescript tsc --noEmit src/hooks/usePipelineExecution.ts`

### 🧪 Acceptance Criteria:
- [x] Файл `src/hooks/usePipelineExecution.ts` успішно компілюється.
- [x] При `VITE_USE_DETERMINISTIC=false` логіка SSE не змінюється.
- [x] При `VITE_USE_DETERMINISTIC=true` робиться fetch до `/v1/pipeline/execute-deterministic`.

---

## TASK-V3-P1-B2: Add routes to worker-mcp-drakon.js

**Виконавець:** AGY rpi3b (Raspberry Pi 3B)  
**Пріоритет:** HIGH  
**Статус:** COMPLETED  

### 📋 Що зробити:
1. У `cloudflare-worker/worker-mcp-drakon.js` знайти секцію `// ─── Pipeline proxy` та додати:
   ```javascript
   if (method === 'POST' && path === '/v1/pipeline/execute-deterministic') {
     return await handleDrakonExecuteDeterministic(request, env);
   }
   if (method === 'GET' && path === '/v1/pipeline/execute-deterministic/status') {
     return await handleDrakonExecuteDeterministicStatus(request, env);
   }
   ```
2. Додати реалізацію в кінець файлу:
   ```javascript
   async function handleDrakonExecuteDeterministic(request, env) {
     const payload = await verifyOwnerAuth(request, env);
     if (!payload) return errorResponse('Unauthorized', 401);
     
     let body = {};
     try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON body', 400); }
     
     const functionId = env.DETERMINISTIC_ENGINE_FUNCTION_ID || '6a33b6050037a2fff34f'; // placeholder
     const projectId = env.APPWRITE_PROJECT_ID;
     const apiKey = env.APPWRITE_API_KEY;
     
     const execRes = await fetch(
       `https://fra.cloud.appwrite.io/v1/functions/${functionId}/executions`,
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'X-Appwrite-Project': projectId,
           'X-Appwrite-Key': apiKey,
         },
         body: JSON.stringify({
           async: true,
           body: JSON.stringify(body),
         }),
       }
     );
     
     if (!execRes.ok) return errorResponse(`Execution failed: ${execRes.status}`, 502);
     const execData = await execRes.json();
     return jsonResponse({ execution_id: execData.$id, status: 'accepted' });
   }

   async function handleDrakonExecuteDeterministicStatus(request, env) {
     const url = new URL(request.url);
     const executionId = url.searchParams.get('execution_id');
     if (!executionId) return errorResponse('execution_id required', 400);
     
     const functionId = env.DETERMINISTIC_ENGINE_FUNCTION_ID || '6a33b6050037a2fff34f';
     const projectId = env.APPWRITE_PROJECT_ID;
     const apiKey = env.APPWRITE_API_KEY;
     
     const res = await fetch(
       `https://fra.cloud.appwrite.io/v1/functions/${functionId}/executions/${executionId}`,
       {
         headers: {
           'X-Appwrite-Project': projectId,
           'X-Appwrite-Key': apiKey,
         },
       }
     );
     
     if (!res.ok) return errorResponse(`Status check failed: ${res.status}`, 502);
     const data = await res.json();
     
     let output = undefined;
     if (data.status === 'completed' && data.responseBody) {
       try { output = JSON.parse(data.responseBody); } catch (_) {}
     }
     
     return jsonResponse({
       execution_id: data.$id,
       status: data.status,
       events: output ? output.events : [],
       error: data.status === 'failed' ? (data.errors || 'Function failed') : undefined,
     });
   }
   ```
3. Перевірити синтаксис файлу.
