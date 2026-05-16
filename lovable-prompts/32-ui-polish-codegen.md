# Lovable Prompt 32 — UI Polish: CodeGenerationPanel

## Summary

Виправлення 8 UX-проблем виявлених під час UI-review та візуального аудиту скрінів.
Незалежний від Sprint 2.1 (Monaco) — можна застосовувати окремо.

Файл: `src/components/pipeline/CodeGenerationPanel.tsx`

---

## Task 32.1: Виправити порядок елементів форми

Поточний порядок в JSX:
1. Language tabs (PYTHON / TYPESCRIPT / JAVASCRIPT)
2. Scheme selector dropdown
3. Description textarea
4. Генерувати button

**Правильний порядок** (схема → мова → опис → дія):
1. Scheme selector dropdown
2. Language tabs
3. Description textarea
4. Генерувати button

Перемістити JSX блок scheme-selector **вище** language tabs.

---

## Task 32.2: Copy button — always visible

В `status === "done"` блоці знайти клас `opacity-0`:

```tsx
// BEFORE:
className="... opacity-0 group-hover:opacity-100 ..."

// AFTER:
className="... opacity-60 group-hover:opacity-100 ..."
```

---

## Task 32.3: Генерувати button — disabled state

```tsx
// BEFORE:
<button type="submit" className="w-full ...">
  Генерувати
</button>

// AFTER:
<button
  type="submit"
  disabled={!selectedScheme}
  title={!selectedScheme ? "Спочатку виберіть схему зі списку" : undefined}
  className="w-full ... disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
>
  Генерувати
</button>
```

---

## Task 32.4: Scale on press + tabular numbers

Додати `active:scale-[0.96] transition-transform duration-75` до кнопок:
- Генерувати
- Перегенерувати
- Copy

Додати `tabular-nums` до elapsed/iterations span:
```tsx
// BEFORE:
<span className="font-mono text-[11px] text-[var(--text-muted)]">
  {elapsed}s · {result.iterations} ітерацій
</span>

// AFTER:
<span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
  {elapsed}s · {result.iterations} ітерацій
</span>
```

---

## Task 32.5: Monaco height 300px

Підтверджено візуально: поточний `max-h-[160px]` показує **лише 3 рядки з 20**.

Якщо Sprint 2.1 (Monaco) вже застосовано — змінити висоту:
```tsx
// BEFORE: height="160px"
// AFTER:  height="300px"
```

Якщо Monaco ще не встановлено — змінити `<pre>` клас:
```tsx
// BEFORE:
className="... max-h-[160px] ..."

// AFTER:
className="... max-h-[300px] ..."
```

Також до Monaco options додати:
```tsx
scrollbar: {
  verticalScrollbarSize: 4,
  horizontalScrollbarSize: 4,
  alwaysConsumeMouseWheel: false,
}
```

---

## Task 32.6: [NEW] Закривати праву панель при відкритті Генерації

**Проблема (підтверджено на скрін `03b`):** "АНАЛІЗ КОДУ" (права панель) відкрита
одночасно з нижньою панеллю "Генерація". Два panels займають половину екрану кожен —
основний контент (схема) не видно.

**Рішення:** Панелі взаємовиключні.

Знайти стейт/логіку що контролює видимість правої панелі (ймовірно `showAnalysisPanel`,
`isRightPanelOpen`, або подібне в батьківському компоненті `DiagramsPage` /
`PipelineLayout`).

При кліку на таб "Генерація" — закрити праву панель:
```tsx
// В обробнику кліку на таб "Генерація":
setActiveTab("generation");
setShowRightPanel(false);  // або відповідний setter

// В обробнику кліку на таб "Аналіз":
setActiveTab("analysis");
setShowRightPanel(true);
```

Якщо правою панеллю керує інший компонент — передати callback через props або
через спільний стейт (context / zustand store).

---

## Task 32.7: [NEW] Вертикальний flow — результат знизу форми

**Проблема:** Кнопки "Генерувати" і "Виберіть схему" розташовані над `<pre>` результатом,
але логічно мають бути **частиною форми**, а результат — **під формою**.

Поточна структура JSX в `status === "done"`:
```
[форма: tabs + textarea + button]
[status bar: ✓ КОД ЗГЕНЕРОВАНО]
[pre: код]
```

Ця структура **правильна** по DOM, але переконатись що форма і результат
розділені візуальним розподільником (`border-t` або `gap`):

```tsx
// Між формою і результатом додати separator:
<div className="border-t border-[var(--border-subtle)] my-2" />
```

Або використати `flex flex-col gap-4` на wrapper щоб форма і результат
мали чіткий візуальний відступ.

---

## Не чіпати

- Загальну структуру компоненту
- CSS variables (design system залишається без змін)
- Логіку SSE streaming та API calls
- localStorage history (Task 2.2 Sprint 2 — окремий промт)
- `drakonwidget.js`
