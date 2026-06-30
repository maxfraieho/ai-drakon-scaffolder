## [ ] TASK-V2-03

**"DRAKON for Kids" — інтерактивний туторіал**

### Проблема
Потрібно створити 3-хвилинну гру-онбординг для ознайомлення з DRAKON.

### Файли для зміни
`src/routes/tutorial.tsx` (новий файл)
`src/components/tutorial/TutorialGame.tsx` (новий файл)
`src/components/workspace/WorkspaceShell.tsx` (додати лінк на туторіал)
**УВАГА:** Аналіз `WorkspaceShell` показав CRITICAL impact. Обережно модифікувати навігацію, щоб не зламати інші роути.

### Що зробити

1. **Туторіал (TutorialGame)**:
   Створити інтерактивний компонент (міні-гра) з 5 рівнями:
   - Рівень 1: "Це Початок" → розміщення вузла "Start"
   - Рівень 2: "Це Дія (Action)" → з'єднання двох дій
   - Рівень 3: "Це Розвилка (if/else)" → створення гілки
   - Рівень 4: "Це Цикл (for/while)" → створення петлі
   - Рівень 5: Скласти алгоритм "Заварити чай" → перегляд згенерованого коду
   
2. **Сторінка туторіалу**:
   Підключити `TutorialGame` до `src/routes/tutorial.tsx` через `createFileRoute('/tutorial')`.

3. **Навігація**:
   Додати кнопку "🕹️ Tutorial" у Sidebar (`WorkspaceShell.tsx`).

### Верифікація
```bash
npm run build && echo OK
```
Переконатися, що меню навігації не зламано.

### Деплой
Зміни комітяться та пушаться в GitHub.

### Коміт
```
feat(tutorial): add drakon for kids interactive tutorial (TASK-V2-03)
```

### Diary
```
SESSION:2026-06-30|TASK-V2-03:tutorial-game|commit:<hash>|feat:added-interactive-tutorial|★★★
```

### !!IMPORTANT!! Де запускати
1. ЛОКАЛЬНО на AGY (Termux на 192.168.3.234): `cd ~/workspace/ai-drakon-scaffolder && git pull`
2. Імплементуй файли.
3. Запусти `npm run build` для оновлення роутів.
4. git commit + push від AGY.

## [ ] TASK-TEST-SPRINT-2

**UI Testing using Windows Chrome (MCP chrome-win)**

### Проблема
Потрібно протестувати всі внесені зміни (Sprint 1 та 2) на ноутбуці з Windows через браузер. 

### Де запускати
AGY на RPi3B (192.168.3.234)

### Що зробити
1. Використай MCP `chrome-win` (якщо налаштований), який дозволяє підключитися до Chrome на Windows-ноутбуці по локальній мережі (або використовуй інший доступний MCP/браузер, що є на RPi3B для віддаленого тестування).
2. Відкрий локальну версію або задеплоєний сайт (наприклад, http://localhost:5173 або Cloudflare URL).
3. Протестуй наступний флоу:
   - Відкрити `/magic` (Magic Demo) і перевірити генерацію.
   - Відкрити `/templates` (Gallery) і створити проект з шаблону.
   - Відкрити редактор і натиснути "Поділитись", після чого відкрити нову вкладку з лінком `/s/<short_id>` і перевірити, чи завантажилась Read-only схема.
   - Перевірити відображення "Review Changes overlay" (в ручному режимі або симулювавши diff, якщо є можливість).
   - Запустити щойно створений `TutorialGame` (TASK-V2-03) і пройти його.
4. Якщо виявиш баги — зафіксуй їх у файл `development/findings/TEST_BUGS.md`.

### Коміт
```
chore(test): document testing results for Sprint 2 via MCP
```

## [ ] TASK-V2-06

**PWA with Voice & Offline**

### Що зробити
1. `manifest.json` + Service Worker (використати Vite PWA).
2. Web Speech API для voice input.
3. IndexedDB для offline storage IR.
4. Push notifications.

### Виконавець
AGY phone

### Де запускати
Termux на AGY phone (192.168.3.25)

## [ ] TASK-V2-07

**Time Travel for Diagrams**

### Що зробити
1. Авто-коміт `.drakon.json` файлів кожні 30с під час редагування (використати debounce).
2. UI: Timeline компонент знизу canvas (`src/components/drakon/DiagramTimeline.tsx`).
3. Diff-view між commits.
4. "Restore" → повертає до попередньої версії (оновлює поточний файл).

### Виконавець
AGY3 (Termux tablet)

### Де запускати
Termux на AGY3 (192.168.3.204)

## [x] TASK-V2-08

**Pitch Mode Presentation**

### Що зробити
1. Route `/pitch/$diagramId`
2. Fullscreen mode + ESC для виходу
3. Анімація виконання (таймер/шлях по вузлах)
4. SpeechSynthesis API для AI-коментарів (коментар до кожного вузла)

### Виконавець
Claude (OrangePi) - In progress

## [ ] TASK-V2-09a

**Realtime Multi-user: Backend Infra**

### Що зробити
1. Налаштувати Cloudflare Durable Objects (`RoomDO`) у `cloudflare-worker/`.
2. Реалізувати WebSocket endpoints для підключення до `RoomDO`.
3. Broadcast повідомлень (курсори, зміни) між підключеними клієнтами.

### Виконавець
Copilot (Dev Server) - Backend / Infra

---

## [ ] TASK-V2-09b

**Realtime Multi-user: Sync & OT**

### Що зробити
1. Інтегрувати `Yjs` (чи OT) для синхронізації стану Drakon IR.
2. Прив'язати Yjs до існуючого `DrakonEditor.tsx` (onEdit/onChange).

### Виконавець
AGY3 (Termux tablet) - React

---

## [ ] TASK-V2-09c

**Realtime Multi-user: Cursors & UI**

### Що зробити
1. Відображення `Cursor presence` інших користувачів на canvas.
2. Система "Comments" у `EVIDENCE drawer` (залишати нотатки на вузлах).

### Виконавець
AGY3 (Termux tablet) - React UI
