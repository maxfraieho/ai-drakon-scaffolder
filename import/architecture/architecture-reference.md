# AI-DRAKON Platform — Architecture Reference

> Цей документ є незмінним architectural contract для всіх змін у проекті.
> Читай його перед кожним кроком і не порушуй жодного правила нижче.

---

## Стек проекту

- **Frontend**: React 19, TanStack Router/Query, Zustand, Vite, shadcn/ui + Tailwind
- **Backend**: Cloudflare Worker (MCP JSON-RPC + REST), S3-compatible storage (MinIO)
- **DRAKON engine**: `drakonwidget.js` — vanilla JS бібліотека, підключена через `adapter.ts`
- **Auth**: JWT, зберігається в localStorage (відомий борг — не погіршувати)

---

## Незмінні правила (порушення = регресія)

### 1. drakonwidget.js — не чіпати ніколи
Це детермінований layout engine. Він обчислює Manhattan routing ліній без перетинів.
Будь-яка зміна цього файлу або його ініціалізації в `DrakonEditor.tsx` заборонена.

### 2. IR не містить координат
`IrDiagram` і `IrItem` не мають полів `x`, `y`, `position`, `left`, `top`, `coords`.
Координати — виключна відповідальність `drakonwidget.js`. LLM їх не обчислює.

### 3. Розподіл відповідальності HTSE pipeline
```
Сирий код
   ↓
[AST Parser: ts-morph] — детермінований, без LLM
   ↓
[LLM] — тільки семантика: розставляє one/two pointers, не координати
   ↓
[Graph Validator] — детермінований, блокує помилки до рендерингу
   ↓
[drakonwidget.js] — layout і рендеринг
```
LLM **не обчислює геометрію**. LLM **не повертає** поля x/y.

### 4. one і two — семантика переходів
- `one` → наступний вузол по **головному шляху** (вниз, happy path)
- `two` → наступний вузол по **альтернативному шляху** (вправо, error/else)
- Обидва містять **id вузла**, не координати

### 5. Існуючі MCP tools не ламати
Поточні tools завжди мають працювати:
`drakon.listdiagrams` | `drakon.getdiagram` | `drakon.savediagram` | `drakon.deletediagram`
Нові tools тільки додаються, не замінюють існуючі.

### 6. Backward compatibility для старих схем
Будь-яке нове поле в `DrakonDiagram` або metadata — **опціональне** (`?`).
Старі схеми без нових полів мають завантажуватись без помилок або міграцій.

### 7. ts-morph не працює в Cloudflare Worker
Node.js API недоступний у Cloudflare runtime.
AST analyzer розміщується або як окремий Node.js сервіс, або як `scripts/analyzer/`.

### 8. FIFO для мутацій
Всі зміни схеми йдуть через чергу. Прямий setState у store без `enqueueMutation` — заборонений для нових операцій. Існуючий editor flow адаптується обережно.

---

## Структура нових модулів

```
src/
  lib/
    htse/
      ir-types.ts          ← Canonical IR типи (IrDiagram, IrItem)
      ir-schema.ts         ← Zod validation
      ir-helpers.ts        ← pure functions
      ir-to-diagram.ts     ← конвертація IR → DrakonDiagram
      diagram-to-ir.ts     ← конвертація DrakonDiagram → IR
      ir-examples.ts       ← test fixtures
      ir-validator-client.ts
      diagram-context.ts   ← hierarchy helpers
      code-diagram-diff.ts ← sync engine
    analysis/
      ts-analyzer.ts       ← ts-morph analyzer
  types/
    analysis.ts            ← AnalysisJob, AnalysisSummary, PlannedDiagram
    mutations.ts           ← MutationOp, MutationResult
  components/
    htse/
      ValidationPanel.tsx
```

---

## Naming convention для схем

| Рівень | Префікс | Приклад |
|--------|---------|---------|
| L0 — System | `system.` | `system.overview` |
| L1 — Module | `module.` | `module.editor` |
| L2 — Flow | `flow.` | `flow.save-diagram` |
| L3 — Procedure | `procedure.` | `procedure.handleCommit` |

---

## Перед кожною зміною — відповідай на ці питання

1. Які файли я збираюся змінювати?
2. Чи торкаюся я `drakonwidget.js`, `useDiagramStore`, `auth`, існуючих MCP tools?
3. Чи додаю X/Y координати в IR?
4. Чи нові поля в типах опціональні?

Після змін показуй:
- список змінених файлів
- архітектурне рішення (1-2 речення)
- що залишилось TODO
- можливі ризики регресії
