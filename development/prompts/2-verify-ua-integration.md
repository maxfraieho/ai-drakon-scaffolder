# ЗАВДАННЯ: Верифікація інтеграції Understand-Anything та тестування інтерфейсу (TASK-DRK-VERIFY)

## РОЛЬ
Ти — агент-тестувальник (QA / Validator). Твоя мета — перевірити коректність реалізації завдань DRK-17, 18, 19, 20, 22 на RPI 3b у робочій директорії `/home/vokov/workspace/ai-drakon-scaffolder`.

Для автоматизованого тестування інтерфейсу ти будеш використовувати MCP-сервер `agent-workspace`, що надає доступ до Chromium та X11 на машині RPI 3b.

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
1. Перевір, що в коді Cloudflare Worker (`cloudflare-worker/worker-mcp-drakon.js`) присутній роут `/v1/understand/status`.
2. Провалідуй синтаксис Javascript-файлу за допомогою Node:
   ```bash
   node -c cloudflare-worker/worker-mcp-drakon.js
   ```

### Крок 4: Автоматизоване тестування інтерфейсу (Браузер)
За допомогою MCP-інструментів `agent-workspace` виконай наступні дії:

1. **Запусти X11 сесію**:
   Виклич інструмент `workspace_start` з параметром `acknowledge_hidden_workspace=true`.

2. **Запусти Chromium та перейди на сторінку**:
   Виклич інструмент `workspace_open_browser` з URL `https://ai-drakon-setup.pages.dev`.

3. **Зачекай завантаження та перевір головний екран**:
   - Переконайся, що навігація завершена: `workspace_browser_navigate(url="https://ai-drakon-setup.pages.dev", wait_ms=4000)`.
   - Зроби скріншот екрана: `workspace_screenshot(output_path="/tmp/screen_home.png")`.
   - Переглянь файл `/tmp/screen_home.png` за допомогою інструменту `view_file` (без вказання рядків), щоб візуально підтвердити запуск.

4. **Тестування вкладки Knowledge Graph**:
   - Оскільки на сторінці Workspace тепер є три вкладки (Код, Документація, Knowledge Graph), виклич `workspace_browser_snapshot`, щоб знайти селектор для кнопки вкладки "Knowledge Graph".
   - Надішли клік на вкладку за допомогою `workspace_browser_click(selector="...")` (або виклич `workspace_paste_text` після фокусування, якщо це React SPA).
   - Зачекай 3 секунди та зроби скріншот: `workspace_screenshot(output_path="/tmp/screen_kg.png")`.
   - Прочитай `/tmp/screen_kg.png` за допомогою `view_file`. Має відобразитись панель Knowledge Graph (з повідомленням "Run /understand on your project..." або інтерактивним графом).

5. **Тестування EVIDENCE Drawer**:
   - Перейди на сторінку редактора схем (наприклад, відкривши будь-яку діаграму зі списку).
   - Зачекай рендерингу та зроби скріншот: `workspace_screenshot(output_path="/tmp/screen_editor.png")`.
   - Переконайся, що внизу сторінки відображається панель EVIDENCE, яка показує текст: *"No analysis data yet. Save a diagram to see impact analysis."* (замість старого *"Waiting for Phase C compiler trace data..."*).

### Крок 5: Перевірка Git статусу
Переконайся, що твій робочий простір синхронізований:
```bash
git status
```

---

## РЕЗУЛЬТАТ
Надішли детальний звіт:
1. Статус наявності файлів.
2. Результат typecheck адаптерів.
3. Опис візуального тестування (додай скріншоти або підтвердь успішне завантаження вкладки Knowledge Graph та панелі EVIDENCE).
4. Запиши результат у свій Diary:
   `SESSION:2026-06-21|TASK-DRK-VERIFY:done|status:success|★★★`
