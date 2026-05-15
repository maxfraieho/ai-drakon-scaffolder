# План: Workspace Shell за дизайном Stitch

## Мета
Привести застосунок до структури з `import/stitch_ai_drakon_workspace_shell/pipeline_ui_prototype.html` (workspace_idle + analysis_panel + generation_drawer), реалізуючи концепцію canvas-first IDE з `/docs/concept`.

## Нова структура вікна (замість поточної DiagramsPage з картками)

```
┌─────────────────────────────────────────────────────────────┐
│ TopBar 32px: ● AI-DRAKON │ breadcrumb        agent/theme/⎋ │
├──┬───────────┬───────────────────────────────────────┬──────┤
│  │ DIAGRAMS  │ canvas-toolbar: name·CC·[⊙Аналіз][‹›Ген]│ R   │
│  │ [search]  │                                         │ I   │
│40│ ▾ folder  │                                         │ G   │
│px│  diagram  │           DRAKON CANVAS                 │ H   │
│  │  ●diagram │                                         │ T   │
│IC│  diagram  │                                         │ 380 │
│ON│           │                                         │ px  │
│  │           │                                         │     │
│RA│           ├───────────────────────────────────────┬─┤slide│
│IL│           │ BOTTOM DRAWER (Generation, 200/280px) │ │-in  │
└──┴───────────┴───────────────────────────────────────┴──────┘
```

## Етапи

### 1. WorkspaceShell — нова коренева оболонка (`src/components/workspace/`)
- `WorkspaceShell.tsx` — TopBar 32px + IconRail 40px + LeftPanel 220px (collapsible) + центр + BottomDrawer + RightPanel
- `IconRail.tsx` — 5 секцій: Diagrams/Notes/Graph/GitHub/Agent + Settings знизу
- `LeftPanel.tsx` — заголовок + пошук + список діаграм/папок
- `CanvasToolbar.tsx` — плаваючий toolbar з ⊙Аналіз / ‹›Генерація / zoom
- `BottomDrawer.tsx` + `RightSlideIn.tsx` — обгортки для existing pipeline panels

### 2. AppHeader → новий TopBar
Зменшення висоти 48→32px, mono-шрифт, breadcrumb, видалення поточних tab-кнопок навігації (нав переходить у IconRail).

### 3. DiagramsPage переписати під canvas-first
- Замість grid карток — одразу canvas з лівим списком
- Click на діаграму у списку → відкриває її в canvas
- Старий card-grid view доступний через окремий tab "Explorer" в LeftPanel
- CodeAnalysisPanel прив'язується як RightSlideIn
- CodeGenerationPanel — як BottomDrawer

### 4. Об'єднати маршрути під WorkspaceShell
- `/diagrams` → workspace з активним Diagrams в IconRail
- `/docs` → workspace з активним Notes
- `/github` → workspace з активним GitHub
- `/sync` → workspace з активним Graph (або окрема)
- `/settings` → workspace з Settings

Кожен маршрут показує контент у LeftPanel + центрі без зміни базової оболонки.

### 5. Тонкі візуальні правки за Stitch
- IBM Plex Sans для UI (додати в `__root.tsx`)
- font-size 11-13px (density)
- amber accent (`#f59e0b`) на active states
- 40/220/380/200 px фіксовані розміри панелей
- збереження стану collapsed/open у localStorage

### 6. Mirror у `.lovable/src/`
Після кожної зміни — копія в `.lovable/src/`.

## Технічні деталі

**Залишається без змін:**
- `DrakonCanvas`, `DrakonEditor` (рендеринг)
- `pipeline-api.ts`, `CodeAnalysisPanel`, `CodeGenerationPanel` (тільки переносимо в нові обгортки)
- Storage: `diagram-storage`, `folder-storage`
- Routing: TanStack file-based

**Видаляється/архівується:**
- Card-grid view DiagramsPage (винесемо в Explorer tab)
- Mobile sheet drawer для папок (замінюється IconRail collapse)

**Файли, які створю:**
- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/IconRail.tsx`
- `src/components/workspace/TopBar.tsx`
- `src/components/workspace/LeftPanel.tsx`
- `src/components/workspace/CanvasToolbar.tsx`
- `src/components/workspace/BottomDrawer.tsx`
- `src/components/workspace/RightSlideIn.tsx`

**Файли, які перепишу:**
- `src/routes/__root.tsx` (видалю AppHeader, поставлю WorkspaceShell)
- `src/pages/DiagramsPage.tsx` (canvas-first)
- `src/components/app/AppHeader.tsx` → видалити або переробити в TopBar

## Поза скоупом
- Логіка пайплайнів (працює як є)
- Drakon рендеринг (не чіпаємо)
- Auth, API
- Mobile responsive (Stitch має окремі мобільні екрани — зроблю базову адаптацію через collapse, повне мобільне UI окремим завданням)

## Питання до тебе перед стартом
Підтверди або скоригуй:
1. **Навігація**: переносимо Diagrams/Git/Sync/Docs/Settings у вертикальний IconRail замість горизонтального TopBar — ОК?
2. **DiagramsPage**: робимо canvas-first (відразу canvas + список зліва), а старий вигляд карток виносимо у вкладку "Explorer" — ОК?
3. **Mobile**: достатньо базового адаптива (рейл і панелі стають collapse/sheet), чи потрібно одразу окремий mobile-shell з референсу?
