# Lovable + Stitch — Workflow та правила

## Загальний workflow

```
1. Написати Lovable промт (за правилами нижче)
2. Зберегти в lovable-prompts/NN-назва.md на dev сервері
3. git push в ОБИДВА репо:
   cd ~/workspace/ai-drakon-setup && git add lovable-prompts/... && git commit -m "..." && git push origin main
   cp lovable-prompts/... ~/workspace/drakon-flow-90aa2999/lovable-prompts/
   cd ~/workspace/drakon-flow-90aa2999 && git add lovable-prompts/... && git commit -m "..." && git push origin main
4. Скопіювати текст промту → вставити в Lovable chat (вручну!)
5. Lovable робить зміни → пушить в drakon-flow-90aa2999
6. Синхронізувати назад в ai-drakon-setup (або git pull --rebase)
7. CF Pages автоматично деплоїть через ~1хв
```

## Правила написання промтів (стандарт із 00-stitch-lovable-template.md)

### Правило 1 — HTML-референс ПЕРШИМ після мети
Lovable читає зверху вниз. Референс на початку → впливає на все що йде далі.

```markdown
## Мета
[Одне речення]

## Референс
**Основний:** `import/stitch_.../variant_a/code.html`, секція `<!-- Назва -->`.
**Дизайн-система:** `import/stitch_.../ai_drakon_ide/DESIGN.md`
> Використовувати тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.
```

### Правило 2 — Нові сторінки: таблиця всіх станів
```markdown
| Стан | HTML-файл | Секція | Що взяти |
|------|-----------|--------|----------|
| Empty | variant_a/code.html | <!-- Empty --> | Layout |
| Loaded | variant_b/code.html | <!-- Data --> | Grid+cards |
```

### Правило 3 — Зміни існуючих компонентів: один файл + конкретна секція
```markdown
## Референс
`import/stitch_.../node_selected/code.html`, секція `<!-- Right Panel -->`.
НЕ переписувати Canvas Area — тільки правий інспектор.
```

### Правило 4 — Нагадування токенів у КОЖНОМУ промті
```markdown
> Використовувати тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.
```

### Правило 5 — Hover/анімації описувати словами
```markdown
> Hover/анімації — в HTML статично, додати:
> - Hover: `bg-surface-container-high`, `transition-colors duration-150`
> - Press: `active:scale-[0.96] transition-transform duration-75`
```

### Правило 6 — Немає Stitch-файлу: найближчий як база + явні відмінності

### Обов'язковий make-interfaces checklist
```markdown
### make-interfaces checklist
- [ ] `antialiased` на кореневому елементі
- [ ] `tabular-nums` на числах
- [ ] `active:scale-[0.96] transition-transform duration-75` на кнопках
- [ ] ≥ 40px hit area
- [ ] `transition-colors` не `transition-all`
- [ ] Concentric border radius
- [ ] Copy/hover кнопки: `opacity-60` не `opacity-0`
```

### Обов'язково в кінці
```markdown
## ВАЖЛИВО: Sync після змін
Скопіюй `src/` до `.lovable/src/`. CF Pages будує з `.lovable/src/`.
```

## Stitch дизайн-система (ключові токени)

```css
/* Кольори */
background/surface: #131313
surface-container-low: #1c1b1b
surface-container: #201f1f
surface-container-high: #2a2a2a
surface-container-highest: #353534
on-surface: #e5e2e1
on-surface-variant: #d8c3ad
outline: #a08e7a
outline-variant: #534434

/* Primary — ТІЛЬКИ для actionable */
primary: #ffc174  (amber)
primary-fixed-dim: #ffb95f
on-primary-fixed: #2a1700

/* Accent — синій для keywords у коді */
tertiary: #8fd5ff

/* Status */
success: #4ade80
error: #ffb4ab
```

```
Font: JetBrains Mono (всі розміри, всі ваги)
Border radius: DEFAULT=0.125rem (2px), lg=0.25rem (3-4px)
Spacing unit: 4px, gutter: 1px, panel-padding: 12px
```

## Поточні Stitch-файли на dev сервері

```
~/workspace/ai-drakon-setup/import/
├── stitch_ai_drakon_codegen_ui_refinement/   ← CodeGenerationPanel (Sprint 2)
│   ├── ai_drakon_ide/DESIGN.md
│   ├── variant_a_monaco_done_state/code.html + screen.png
│   ├── variant_b_idle_history_state/code.html + screen.png
│   └── variant_c_combined_view/code.html + screen.png
├── stitch_ai_drakon_pipeline_panels/         ← Analysis panel
├── stitch_ai_drakon_workspace_shell/         ← Shell/layout
└── stitch_agent_logic_studio/                ← Agent studio
```

## Важливо: drakon-flow-90aa2999 vs ai-drakon-setup

Lovable пушить в `drakon-flow-90aa2999`. Якщо Lovable зробив зміни:
```bash
cd ~/workspace/drakon-flow-90aa2999 && git pull origin main
# Скопіювати .lovable/src/ у ai-drakon-setup/.lovable/src/ та src/
rsync -av ~/workspace/drakon-flow-90aa2999/.lovable/src/ \
          ~/workspace/ai-drakon-setup/.lovable/src/
cd ~/workspace/ai-drakon-setup && git add .lovable/src/ src/ && git commit -m "sync from Lovable" && git push origin main
```
