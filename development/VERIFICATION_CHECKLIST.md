# VERIFICATION CHECKLIST — Sprint 2 (CodeGenerationPanel)

**URL:** https://ai-drakon-setup.pages.dev/diagram/editor?folderId=general&isNew=true
**Що перевіряти:** CodeGenerationPanel після реалізації Lovable (prompt 33)

## Як відкрити панель

1. Відкрий URL вище у браузері (через PinchTab або вручну)
2. Клікни кнопку `</>` (amber) у правому верхньому куті editor — або знайди через accessibility tree кнопку "Відкрити генерацію коду"
3. Панель має з'явитись знизу

**ВАЖЛИВО:** Попередній Claude клікав кнопку, accessibility tree підтвердив що вона стала "Закрити генерацію коду", але панель не була видна на скріншоті. Скоріше за все потрібно скролити сторінку вниз АБО панель має overflow: hidden.

## Чеклист верифікації

### A. Idle State (немає результату генерації)

- [ ] **Панель видна** — знизу екрану, `h-64` (256px)
- [ ] **Header:** ліворуч amber іконка + "ГЕНЕРУВАТИ КОД", праворуч мовний перемикач PY/TS/JS + кнопка закриття
- [ ] **Мовний перемикач в header** (НЕ у тілі форми)
- [ ] **Двоколонковий layout:** ліворуч форма (flex-1), праворуч "ОСТАННІ ГЕНЕРАЦІЇ" (≈320px)
- [ ] **Scheme selector** першим у формі (перед description)
- [ ] **Кнопка ГЕНЕРУВАТИ disabled** (opacity-50, cursor-not-allowed) коли scheme не вибрана
- [ ] **History panel:** якщо ще нема генерацій — пусто або "Ще немає генерацій"
- [ ] **JetBrains Mono** — шрифт у панелі (не Inter!)
- [ ] **Темна палітра:** фон #131313 або близько, не синьо-темна (поточна)

### B. Done State (після генерації)

Як отримати done state через React fiber injection (якщо немає схеми):
```javascript
// У консолі браузера — знайти CodeGenerationPanel і вставити fake result
// Метод з попередньої сесії:
const el = document.querySelector('textarea[placeholder*="Опис"]');
if (el) {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber'));
  let fiber = el[key];
  // Піднятись по fiber до CodeGenerationPanel (має useState hooks)
  // Dispatch result: { code: "def hello():\n    return 'world'", syntax_errors: [], iterations: 2 }
  // elapsed: 3
  // status: 'done'
}
```
Або: вибери схему зі списку → натисни Генерувати → дочекайся результату.

- [ ] **Панель розширюється** до `h-[480px]` з анімацією
- [ ] **Monaco Editor** відображається (НЕ `<pre>` тег)
- [ ] **Monaco:** vs-dark тема, рядки нумеровані, JetBrains Mono
- [ ] **Status bar:** "✓ КОД ЗГЕНЕРОВАНО · syntax: OK"
- [ ] **Timing:** `Xs | N iter` з tabular-nums (числа не скачуть)
- [ ] **Copy button:** видно (opacity-60), НЕ схований (opacity-0)
- [ ] **ПЕРЕГЕНЕРУВАТИ:** amber колір
- [ ] **Кнопки:** active:scale-[0.96] при кліку (тактильний feedback)

### C. Функціональність

- [ ] **localStorage history:** після генерації → закрити/відкрити панель → history item з'являється
- [ ] **History item:** мовний badge + назва схеми + час + N iter
- [ ] **Panel conflict:** відкрити "Аналіз" → "Генерація" панель закривається (і навпаки)
- [ ] **Monaco copy:** Ctrl+A, Ctrl+C в Monaco editor — копіює код
- [ ] **COPY кнопка** — копіює в clipboard

### D. Дизайн-система

- [ ] Фон панелі: темний Obsidian (#131313 / #1c1b1b)
- [ ] Amber (#ffc174) тільки на: active мова-tab, кнопка Generate (enabled), ПЕРЕГЕНЕРУВАТИ
- [ ] Border radius: 2-4px (майже гострі кути), НЕ rounded-xl
- [ ] Border: тонкі 1px лінії кольору #534434

## Скріншоти для порівняння

Stitch референс (на dev сервері):
- Idle: `~/workspace/ai-drakon-setup/import/stitch_ai_drakon_codegen_ui_refinement/variant_b_idle_history_state/screen.png`
- Done: `~/workspace/ai-drakon-setup/import/stitch_ai_drakon_codegen_ui_refinement/variant_a_monaco_done_state/screen.png`

Поточні скріни верифікації: `~/workspace/ai-drakon-setup/import/sprint2_verify/`

## Якщо є відхилення від дизайну

Написати Lovable correction prompt за шаблоном `lovable-prompts/00-stitch-lovable-template.md`:
1. Мета одним реченням
2. HTML-референс першим рядком після мети (конкретна секція)
3. Нагадування токенів
4. Конкретні відхилення (що не так vs що має бути)
5. make-interfaces checklist
6. Нагадування sync src/ → .lovable/src/
