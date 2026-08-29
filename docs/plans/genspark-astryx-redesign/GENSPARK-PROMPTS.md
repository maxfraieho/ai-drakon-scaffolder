# Genspark Agent Prompts — Astryx Redesign

Гілка: `feature/genspark-astryx-redesign`. Три промти для послідовної роботи з Genspark Pro. Кожен — окремий turn/задача в Genspark, не один суцільний блок.

Джерела: `src/styles/astryx.css` (токени, живий код, .184 HEAD `eda65238e`), `TEST_REPORT.md` + `NAV_MAP.md` (Comet UX-аудит 2026-08-28, надано Q напряму в чат), `WORKFORCE-UI-CONSOLIDATED-PLAN.md` §13 (щойно закомічено, `627290c3`).

---

## Промт 1 — Контекст і жорсткі межі (запускати першим, в кожній новій Genspark-сесії)

```
Ти працюєш над візуальним редизайном існуючого веб-застосунку AI-DRAKON
(aidrakon.tech) — платформа для DRAKON-схем, AI-агентів та кодогенерації.
Фронтенд: React + Tailwind, дизайн-система "Astryx" (Meta/Facebook-подібні
токени).

ЖОРСТКІ МЕЖІ (не порушувати):
1. НЕ змінюй бізнес-логіку, роути, API-виклики, назви пропсів/функцій.
   Твоя робота — тільки візуальний шар: кольори, spacing, typography,
   компонентна верстка.
2. Дизайн-система Astryx ВЖЕ існує і має власні CSS-токени. Не вигадуй
   нову палітру з нуля — працюй у межах цих токенів або запропонуй їх
   точкове розширення (нові токени в тому ж форматі імен), а не заміну.
3. Результат має підтримувати light/dark theme (обидва набори токенів
   нижче вже існують і працюють).

Поточні Astryx-токени (light theme, з `src/styles/astryx.css:64-89`):
  --astryx-color-brand: #f59e0b
  --astryx-color-brand-hover: #d97706
  --astryx-color-brand-light: rgba(245, 158, 11, 0.16)
  --astryx-color-on-brand: #17120a
  --astryx-surface-page: #f0f2f5
  --astryx-surface-primary: #ffffff
  --astryx-surface-secondary: #f7f8fa
  --astryx-surface-elevated: #ffffff
  --astryx-text-primary: #1c1e21
  --astryx-text-secondary: #65676b
  --astryx-text-muted: #8a8d91
  --astryx-border-subtle: #e4e6eb
  --astryx-border-focus: #f59e0b
  --astryx-radius-sm/md/lg: 6px / 10px / 16px
  --astryx-shadow-card, --astryx-shadow-dropdown
  --astryx-font-sans: 'Albert Sans', system fallback
  --astryx-font-mono: 'JetBrains Mono'

Dark theme (`[data-astryx-theme="dark"]`, `src/styles/astryx.css:93-111`):
  --astryx-color-brand: #fbbf24
  --astryx-surface-page: #18191a
  --astryx-surface-primary: #242526
  --astryx-text-primary: #e4e6eb
  (решта токенів — та сама структура імен, інші значення)

Підтверди, що зрозумів ці межі, перед тим як переходити до конкретних
задач з наступних промтів.
```

---

## Промт 2 — Причина стильової неузгодженості (дай ПІСЛЯ промта 1)

```
Причина непослідовних стилів у поточному UI: міграція на Astryx-токени
НЕ завершена. Є проміжний "міст" — клас `.astryx-migrated`
(`src/styles/astryx.css:6-19`), який перемаплює старі Tailwind-класи
(bg-gray-950, text-slate-400, bg-teal-500, border-white/10 тощо) на
Astryx-токени, але застосований не до всіх сторінок/компонентів.
Сторінки БЕЗ цього класу (або з рештками старих hardcoded
Tailwind-кольорів) — і є джерелом розсинхронізації стилів, яку ти
бачиш.

Задача: не намальовуй новий дизайн з нуля. Проаналізуй різницю між
сторінками, де Astryx-токени вже застосовані послідовно, і тими, де
лишились старі hardcoded кольори — і запропонуй, як довести МІГРАЦІЮ
до кінця (той самий візуальний результат скрізь), а не новий стиль.

Конкретні сторінки з підтвердженою неузгодженістю (з живого UX-аудиту,
2026-08-28):
- /architect — повністю англомовний UI серед укр. решти (мовна, не лише
  візуальна аномалія)
- /notebooks — змішана мова (Select Notebook, Generation Mode — англ.
  форма під укр. заголовком)
- /trace — dev-жаргон навіть у верстці ("4-Gate Control Plane",
  "RUNTIME · POLICY-ENGINE") — цю сторінку worker-роль НЕ має бачити
  взагалі (harness-level internals), тому тут йдеться не про рескін,
  а про role-gate/приховування
```

---

## Промт 3 — Worker-facing майбутнє (контекст, не негайна задача)

```
Довгостроковий контекст (не роби зараз, просто май на увазі при виборі
компонентної структури): цей же UI згодом отримає окрему роль "worker"
(не розробник) — з окремим спрощеним інтерфейсом, без dev-жаргону
(Codegen, DEV CYCLE, Execution Trace, Harness — це терміни, які worker
НЕ має бачити). Ця робота ще не почалась (заблокована на бекенд-рішеннях,
не стосується тебе зараз) — але якщо компонент можна спроєктувати так,
щоб легко приховати/показати за роллю (напр. явний prop `role` чи
composable wrapper, а не хардкод видимості всередині компонента) —
роби так. Якщо це ускладнює задачу — ігноруй цей пункт, це не вимога
для поточного етапу.
```

---

## Відкрите (з PLAN.md, досі актуальне)

1. Формат виводу Genspark — Figma / CSS-токени JSON / React-компоненти? Впливає, як приземлити результат у гілку.
2. Пріоритетні сторінки для першого проходу.

## Не для Genspark (окремий, вже задокументований трек)

Логічні баги з TEST_REPORT.md (Save→HTTP 500, `/agents` порожній, `/pipelines` Редагувати не відкриває editor, `/workspace` HTTP 502) — це НЕ дизайн-задачі, вони в `WORKFORCE-UI-CONSOLIDATED-PLAN.md` §13 на `main`, окремий трек виправлень.
