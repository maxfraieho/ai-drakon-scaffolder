# Baseline Specification: Drakon Code Generation and Format Contract

## 1. Мета та опис системи (Objective & Scope)
Ця специфікація фіксує фактичну (as-is) поведінку клієнтського кодогенератора алгоритмів ДРАКОН (`generateDrakonCode`), вимоги до структури формату `.drakon` JSON та обов'язкові правила збірки/синхронізації кодової бази проєкту `ai-drakon-scaffolder`.

## 2. Реальний вихідний код (Implementation Reference)

```typescript
// src/lib/codegen/codegenApi.ts:48-97
export async function generateDrakonCode(input: CodegenParams): Promise<CodegenResponse> {
  const token = await getToken();
  const res = await fetch(`${workerUrl()}/v1/codegen`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`codegen HTTP ${res.status}: ${txt}`);
  }
  const init = (await res.json()) as Record<string, unknown>;
  // Sync result — return directly.
  if (typeof init.success === "boolean") { return init as unknown as CodegenResponse; }
  const executionId = init.execution_id as string | undefined;
  if (!executionId) throw new Error("Немає execution_id у відповіді worker");
  // Poll status until completed (up to ~3 min; NIM is fast).
  for (let i = 0; i < 60; i++) {
    await new Promise<void>((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${workerUrl()}/v1/codegen-status?execution_id=${executionId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (!statusRes?.ok) continue;
    const s = (await statusRes.json()) as Record<string, unknown>;
    if (s.status === "completed" && s.output) {
      const out = s.output as CodegenResponse;
      if (!out.success) throw new Error(out.error || "Генерація не вдалася");
      return out;
    }
    if (s.status === "failed") throw new Error(`Codegen failed: ${String(s.error || "невідома помилка")}`);
  }
  throw new Error("Timeout: генерація коду не завершилася за 3 хвилини");
}
```

## 3. Сценарії поведінки (Given-When-Then Scenarios)

### Сценарій 1: Синхронна успішна відповідь (Direct Synchronous Response)
- **Given**: Валідний об'єкт параметрів `input: CodegenParams` та отриманий токен автентифікації `getToken()`.
- **When**: Відбувається виклик `POST /v1/codegen`, сервер повертає статус HTTP 200 із тілом відповіді, в якому поле `success` має булевий тип (`typeof init.success === "boolean"`).
- **Then**: Функція негайно повертає результат `init as unknown as CodegenResponse` без запуску циклу опитування (polling).

### Сценарій 2: Асинхронне виконання з успішним поллінгом (Asynchronous Polling to Success)
- **Given**: Сервер повертає відповідь, де поле `success` не є булевим, але присутнє строкове поле `execution_id`.
- **When**: Функція кожні 3000 мс виконує запит `GET /v1/codegen-status?execution_id=${executionId}` з авторизаційним заголовком, і під час однієї зі спроб отримує відповідь `{ status: "completed", output: { success: true, ... } }`.
- **Then**: Функція повертає об'єкт `out: CodegenResponse` клієнту.

### Сценарій 3: Асинхронне виконання із зафіксованою помилкою генерації
- **Given**: Отримано коректний `execution_id` та запущено цикл опитування статусу.
- **When**: Під час опитування `GET /v1/codegen-status` сервер повертає:
  - або об'єкт зі статусом `status: "completed"`, але `out.success === false`,
  - або об'єкт зі статусом `status: "failed"` та опціональним полем `error`.
- **Then**: 
  - У першому випадку викидається виняток `throw new Error(out.error || "Генерація не вдалася")`.
  - У другому випадку викидається виняток `throw new Error("Codegen failed: <текст помилки>")`.

### Сценарій 4: Таймаут тривалості генерації коду (Polling Timeout)
- **Given**: Отримано валідний `execution_id`, статус генерації на бекенді не переходить у фінальний стан (`completed` або `failed`).
- **When**: Цикл опитування виконує 60 ітерацій по 3000 мс (сумарно ~180 секунд / 3 хвилини).
- **Then**: Функція перериває виконання та викидає виняток:
  `throw new Error("Timeout: генерація коду не завершилася за 3 хвилини")`.

### Сценарій 5: Відсутність ідентифікатора асинхронного виконання (Missing execution_id)
- **Given**: Сервер повернув статус `res.ok === true`, поле `success` не визначено як булеве (`typeof init.success !== "boolean"`), і поле `execution_id` відсутнє або порожнє.
- **When**: Функція перевіряє наявність ідентифікатора для переходу в режим опитування.
- **Then**: Викидається виняток: `throw new Error("Немає execution_id у відповіді worker")`.

### Сценарій 6: Помилка первинного HTTP-запиту (Initial HTTP Failure)
- **Given**: Запит `POST /v1/codegen` завершується з кодом відповіді `res.ok === false` (наприклад, 400, 401, 500 або 502).
- **When**: Клієнт зчитує тіло помилки через `res.text().catch(() => "")`.
- **Then**: Викидається виняток формату: `throw new Error("codegen HTTP <res.status>: <txt>")`.

### Сценарій 7: Стійкість до тимчасових мережевих збоїв під час поллінгу
- **Given**: Триває цикл опитування ідентифікатора `execution_id`.
- **When**: Окремий запит `GET /v1/codegen-status` зазнає мережевого збою (`fetch.catch()` повертає `null`) або сервер повертає `!statusRes.ok`.
- **Then**: Функція ігнорує цю невдалу спробу (`continue`) і продовжує очікування до вичерпання ліміту у 60 спроб.

---

## 4. Інваріанти системи (System Invariants)

### Інваріант 1: Контракт схеми формату `.drakon` JSON
Будь-який валідний документ або результат генерації схеми алгоритму ДРАКОН зобов'язаний суворо відповідати структурі:
- Кореневий об'єкт має обов'язкові поля:
  - `type: "drakon"` — літеральний маркер типу документа.
  - `items: Record<string, DrakonNode>` — мапа ідентифікаторів вузлів на їхні об'єкти.
  - `keywords: object` — словник ключових слів та метаданих схеми.
  - `params: string` — рядок параметрів та аргументів алгоритму.
- **Фіксовані обов'язкові вузли:**
  - Вузол `"1"` — завжди кінцевий вузол типу `end`.
  - Вузол `"2"` — завжди вхідний вузол гілки типу `branch` (початкова точка входу).
- **Специфікація типів вузлів:**
  - Вузол гілки (`branch`): `{ type: "branch", branchId: 0, one: "NEXT_ID" }`
  - Вузол дії (`action`): `{ type: "action", one: "NEXT_ID", content: "description" }`
  - Вузол питання/розгалуження (`question`): `{ type: "question", one: "YES_ID", two: "NO_ID", content: "condition?" }`

### Інваріант 2: Правило дзеркальної синхронізації Lovable (Lovable Sync Rule)
> "ALL changes to `src/` must be mirrored to `.lovable/src/`. CF Pages builds from `.lovable/`."

Порушення цього інваріанта призводить до розбіжності між локальним середовищем розробки та фінальним продакшн-білдом на Cloudflare Pages.
Нормативні ADR: [ADR-0006](../../docs/adr/0006-lovable-mirror-sync-build-contract.md) і [ADR-0007](../../docs/adr/0007-tanstack-start-routetree-contract.md). Перед комітом після змін у `src/` виконати `rsync -av --delete src/ .lovable/src/`; після додавання route file також регенерувати `routeTree.gen.ts` і перевірити parity обох checkout-ів.

---

## 5. Межі застосування (Out of Scope)
До меж цієї специфікації **НЕ входять**:
- UI-компоненти редактора схем (`drakonwidget`), візуальні віджети та полотно рендерингу схем.
- Обробка подій маніпулятора миші, перетягування (drag-and-drop) та малювання ліній зв'язків.
- Внутрішня реалізація нейромережевих моделей кодогенерації (NIM / LLM backend).
- UI-handoff F3 у `src/pages/CodegenPage.tsx` (codegen → editor) не змінює чинний контракт `generateDrakonCode` у `src/lib/codegen/codegenApi.ts:47-96`; GWT-сценарії цього API залишаються as-is.
