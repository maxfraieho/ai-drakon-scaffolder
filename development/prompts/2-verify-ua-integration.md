# ЗАВДАННЯ: Верифікація інтеграції Understand-Anything та тестування інтерфейсу (TASK-DRK-VERIFY)

## РОЛЬ
Ти — агент-тестувальник (QA / Validator). Твоя мета — перевірити коректність реалізації завдань DRK-17, 18, 19, 20, 22 на RPI 3b у робочій директорії `/home/vokov/workspace/ai-drakon-scaffolder`.

---

## КРОКИ ДЛЯ ВИКОНАННЯ

### Крок 1: Перевірка наявності та синхронізації файлів
Переконайся, що всі створені та змінені файли існують як в оригінальній директорії `src/`, так і в `.lovable/src/`:
1. `src/lib/understand/types.ts` та `.lovable/src/lib/understand/types.ts`
2. `src/lib/understand/context.ts` та `.lovable/src/lib/understand/context.ts`
3. `src/lib/understand/diff.ts` та `.lovable/src/lib/understand/diff.ts`
4. `src/lib/understand/agent-context.ts` та `.lovable/src/lib/understand/agent-context.ts`
5. `src/lib/understand/index.ts` та `.lovable/src/lib/understand/index.ts`
6. `src/components/workspace/KnowledgeGraphPanel.tsx` та `.lovable/src/components/workspace/KnowledgeGraphPanel.tsx`
7. `src/pages/WorkspacePage.tsx` та `.lovable/src/pages/WorkspacePage.tsx`
8. `cloudflare-worker/worker-mcp-drakon.js` та `.lovable/cloudflare-worker/worker-mcp-drakon.js`

### Крок 2: Верифікація типів (Typecheck)
Оскільки локальні залежності (`node_modules`) не встановлені повністю для уникнення OOM на RPI 3b, виконай перевірку типів окремо для файлів ядра та адаптерів UA:
```bash
npx -y -p typescript tsc src/lib/understand/*.ts --noEmit --target es2022 --module esnext
```
Переконайся, що команда завершується з кодом `0` та не повертає помилок компіляції.

### Крок 3: Перевірка логіки роуту у Worker
Перевір, що код Cloudflare Worker містить роут `/v1/understand/status`.
Для тестування синтаксису коду воркера запусти локальний dry-run через wrangler (якщо wrangler встановлено):
```bash
npx wrangler dev --dry-run
```
Або просто провалідуй синтаксис Javascript-файлу за допомогою Node:
```bash
node -c cloudflare-worker/worker-mcp-drakon.js
```

### Крок 4: Аналіз коду інтерфейсу та вкладок
1. Перевір `src/pages/WorkspacePage.tsx` — переконайся, що:
   - Вкладка `kg` (Knowledge Graph) присутня у списку режимів: `type WorkspaceMode = "code" | "docs" | "kg"`.
   - Вона рендерить `<KnowledgeGraphPanel graphJsonUrl={graphJsonUrl} />`.
   - Змінна `graphJsonUrl` формується з параметрами `owner`, `repo`, `branch`, `token`.
2. Перевір `src/components/workspace/WorkspaceShell.tsx` — переконайся, що:
   - Додано стейт `const [evidenceData, setEvidenceData] = useState<string | null>(null);`.
   - У панелі `EVIDENCE` замість старого хардкод-тексту рендериться вміст `evidenceData` (або повідомлення `No analysis data yet...`).

### Крок 5: Перевірка Git та Синхронізації
Перевір статус Git-репозиторію. Робоча директорія має бути чистою, а всі зміни — запушеними:
```bash
git status
git log -n 5 --oneline
```

---

## РЕЗУЛЬТАТ
Напиши звіт про результати тестування:
1. Чи всі файли на місці та синхронізовані з `.lovable/`? (Так/Ні)
2. Чи успішно пройшов typecheck адаптерів? (Код виходу / Помилки)
3. Чи валідний синтаксис Worker API?
4. Чи чистий `git status`?
5. Запиши результат у свій Diary:
   `SESSION:2026-06-21|TASK-DRK-VERIFY:done|status:success|★★★`
