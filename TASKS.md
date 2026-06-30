## [ ] TASK-V2-05-FIX

**Make Pipelines and Trace UI visible in the App**

### Проблема
Користувач після авторизації через GitHub не бачить жодних змін в UI (немає пайплайнів, гейтів, чи панелі trace). Компоненти `PipelineDrakonView`, `EvidenceDrawer`, `GateIndicators` та роут `/trace` були створені, але вони не інтегровані в основну навігацію (Sidebar / Dashboard) або роутер `@tanstack/react-router` не згенерував їх.

### Файли для зміни
`src/components/workspace/WorkspaceShell.tsx` (додати посилання на Pipelines та Trace у навігацію)
`src/pages/Index.tsx` або `src/routes/index.tsx` (додати посилання з головного дашборду)
`src/routeTree.gen.ts` (потребує регенерації)
`package.json` (можливо, додати скрипт `tsr generate`)

### Що зробити

1. **Регенерація роутингу**:
   Запустити генератор `@tanstack/react-router` (зазвичай це відбувається автоматично при `npm run dev` або `npm run build`), щоб `/trace` з'явився у `routeTree.gen.ts`.
   
2. **Навігація (Sidebar)**:
   У `WorkspaceShell.tsx` (або `AppSidebar.tsx`, якщо він там є), переконатися, що є видимі кнопки/посилання на:
   - `/pipelines` (PipelinesPage)
   - `/trace` (Execution Trace)
   
3. **Dashboard (Index)**:
   На головній сторінці (де відображається список "Projects"), додати кнопку "Open Pipelines" та "View Traces", щоб користувач міг туди клікнути одразу після входу.

4. **Тестування UI**:
   Переконатися, що при переході на сторінку пайплайну відображається `PipelineDrakonView` з `GateIndicators` та `EvidenceDrawer`.

### Верифікація
```bash
npm run build && echo OK
```
Та перевірка наявності `/trace` у `src/routeTree.gen.ts`.

### Деплой
Коміт та пуш в `main` (Cloudflare Pages підхопить автоматично).

### Коміт
```
fix(ui): integrate pipelines and trace routes into main navigation (TASK-V2-05-FIX)
```

### Diary
```
SESSION:2026-06-30|TASK-V2-05-FIX:ui-integration|commit:<hash>|fix:make-pipelines-visible|★★★
```

### !!IMPORTANT!! Де запускати
1. ЛОКАЛЬНО на AGY (Termux на 192.168.3.234): `cd ~/workspace/ai-drakon-scaffolder && git pull`
2. Зроби необхідні зміни.
3. Запусти генерацію роутів: `npm run build` або `npm run dev` на пару секунд.
4. git commit + push від AGY.
