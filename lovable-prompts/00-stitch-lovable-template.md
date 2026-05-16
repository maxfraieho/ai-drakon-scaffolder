# Стандарт написання Lovable-промтів із Stitch-дизайном

Цей файл — обов'язковий шаблон для всіх Lovable-промтів, що застосовують Stitch-дизайн.

---

## Правило 1 — HTML-референс першим рядком після мети

Lovable читає структуру зверху вниз. Якщо референс є на початку, він враховується при генерації всього що йде далі. Якщо внизу — ігнорується.

```markdown
## Мета
[Одне речення що треба зробити]

## Референс
**Основний:** `import/stitch_.../code.html`, секція `<!-- Назва секції -->`.
**Дизайн-система:** `import/stitch_.../ai_drakon_ide/DESIGN.md`

> Використовувати тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.
```

---

## Правило 2 — Для нових сторінок: таблиця всіх станів

Lovable генерує всі стани за один прохід. Якщо не вказати всі стани одразу — доведеться допрацьовувати окремими промтами.

```markdown
| Стан | HTML-файл | Секція | Що взяти |
|------|-----------|--------|----------|
| Empty | `variant_a/code.html` | `<!-- Empty State -->` | Весь layout |
| Loaded | `variant_b/code.html` | `<!-- Data View -->` | Grid + cards |
| Error | Немає референсу | — | Адаптуй від Empty: червона рамка, текст помилки |
```

---

## Правило 3 — Для змін існуючих компонентів: один файл + секція

Давати тільки один HTML-файл з точною вказівкою секції. Якщо давати весь файл без вказівки — Lovable може переписати що не треба.

```markdown
## Референс
`import/stitch_.../node_selected/code.html`, секція `<!-- Right Panel (Inspector) -->`.
НЕ переписувати Canvas Area і SideNav — тільки правий інспектор.
```

---

## Правило 4 — Нагадування токенів у кожному промті

Без цього нагадування Lovable через кілька промтів починає знову хардкодити кольори.

```markdown
> **Токени:** Використовувати тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.
```

Один рядок, одразу після посилання на референс. Завжди.

---

## Правило 5 — Hover та анімації — описувати словами

Stitch не завжди відображає динамічні стани в HTML (hover, focus, active, transitions).
Поряд із посиланням на HTML додавати:

```markdown
> Hover/анімації — в HTML статично, додати:
> - Hover: `bg-surface-container-high`, перехід `transition-colors duration-150`
> - Press: `active:scale-[0.96] transition-transform duration-75`
> - Відкриття: `transition-[height] duration-200 ease-in-out`
```

---

## Правило 6 — Немає Stitch-файлу для компонента

Давати **найближчий існуючий** як базу і явно писати що відрізняється.
Lovable краще адаптує від близького референсу, ніж будує з нуля по описі.

```markdown
## Референс
Немає прямого референсу для цього компонента. Базуватись на:
`import/stitch_.../variant_a/code.html`, секція `<!-- Panel Header -->`.

Відмінності від референсу:
- Заголовок: "ЛОГИ" замість "ГЕНЕРУВАТИ КОД"
- Іконка: `terminal` замість `code`
- Права частина header: кнопка "Очистити" замість перемикача мов
```

---

## Обов'язковий make-interfaces checklist

Додавати в кожний промт де є UI-компоненти:

```markdown
### make-interfaces checklist (перевір перед фінішем)
- [ ] `antialiased` на кореневому елементі
- [ ] `tabular-nums` на числах що оновлюються динамічно
- [ ] `active:scale-[0.96] transition-transform duration-75` на всіх кнопках
- [ ] Усі інтерактивні елементи ≥ 40px hit area
- [ ] `transition-colors` (НЕ `transition-all`)
- [ ] Concentric border radius: outer = inner + padding
- [ ] `opacity-60` (НЕ `opacity-0`) для кнопок що з'являються при hover
```

---

## Обов'язкове нагадування в кінці кожного промту

```markdown
## ВАЖЛИВО: Sync після змін
Після всіх змін скопіюй `src/` до `.lovable/src/` — вони мають бути ідентичні.
CF Pages будує з `.lovable/src/`.
```

---

## Шаблон для нового компонента (copy-paste основа)

```markdown
# Prompt NN — [Мета одним реченням]

## Референс
**Основний:** `import/stitch_[dir]/[variant]/code.html`, секція `<!-- [Section Name] -->`.
**Дизайн-система:** `import/stitch_[dir]/ai_drakon_ide/DESIGN.md`
> Використовувати тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.

## Стани

| Стан | HTML-файл | Секція | Що взяти |
|------|-----------|--------|----------|
| [state] | `variant_a/code.html` | `<!-- Section -->` | [description] |

> Hover/анімації — в HTML статично, додати:
> - [hover rules]
> - [press rules]

## Файл для зміни
`src/components/[path]/[Component].tsx`

## Зміни

[Specific implementation instructions]

### make-interfaces checklist
- [ ] `antialiased` на кореневому елементі
- [ ] `tabular-nums` на числах що оновлюються
- [ ] `active:scale-[0.96] transition-transform duration-75` на кнопках
- [ ] ≥ 40px hit area
- [ ] `transition-colors` не `transition-all`
- [ ] Concentric border radius

## Що НЕ чіпати
- `drakonwidget.js`
- [інші компоненти]

## ВАЖЛИВО: Sync після змін
Скопіюй `src/` до `.lovable/src/`.
```
