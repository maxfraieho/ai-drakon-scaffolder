# Comet Browser Agent — Genspark Setup Prompt

Промт для Comet-агента (браузер, що сам оперує формами/чатом), використовується
разом з `GENSPARK-PROMPTS.md` (3 брифінг-промти для самого Genspark-чату).
Джерело форми: `docs/screenshot/genspark/Screenshot.png`, `Screenshot1.png`
(живий скріншот модалки "New design system", 2026-08-30).

Порядок: спершу цей промт (заповнення форми створення), потім три промти з
`GENSPARK-PROMPTS.md` у чаті Genspark вже після створення дизайн-системи.

---

## Промт для Comet — крок 1: створення дизайн-системи

```
Ти працюєш у Genspark, модалка "New design system" (Describe your brand.
We'll generate tokens, components, and UI kits you can reuse across projects).

Заповни поля так:

1. Brand (обов'язкове):
AI-DRAKON — SaaS-платформа для створення й керування DRAKON-схемами та
AI-агентами. Основні модулі: редактор DRAKON-схем, конвеєр код↔схема
(bidirectional), студія агентів (pipeline-конфіги: docs-agent, drakon-agent,
sonate-solidaire-agent, sharon_consultant тощо), workspace для документації.
Мультитенантність через Appwrite Teams, backend — Cloudflare Workers + D1.
Двомовний інтерфейс (укр./англ., зараз частково нелокалізований — деякі
сторінки повністю англомовні, що є відомим дефектом, не наміром).

2. Style notes (optional):
НЕ дизайн з нуля — існує дизайн-система "Astryx" (Meta/Facebook-подібні
токени), яку треба ДОВЕСТИ ДО ПОСЛІДОВНОСТІ, не замінити. Поточні токени:
- Brand color (світла тема): #f59e0b (amber), hover #d97706
- Brand color (темна тема): #fbbf24
- Surface/page (світла): #f0f2f5, (темна): #18191a
- Text primary (світла): #1c1e21, (темна): #e4e6eb
- Border radius: sm 6px, md 10px, lg 16px
- Font: 'Albert Sans' (sans), 'JetBrains Mono' (mono)
- Тон: технічний, чистий, нейтральний (не яскравий/іграшковий) — інструмент
  для розробників та бізнес-користувачів (worker/supervisor ролі).
Проблема, яку треба вирішити: міграція на ці токени НЕЗАВЕРШЕНА — частина
сторінок і компонентів все ще використовує старі hardcoded Tailwind-кольори
(bg-slate-900, text-gray-400 тощо) замість токенів, звідси візуальна
неузгодженість. Мета Genspark-проходу — довести узгодженість, не вигадати
нову палітру.

3. Link GitHub repositories:
https://github.com/maxfraieho/ai-drakon-scaffolder
(додай через "+ Add" — це дає Genspark прямий доступ до реального коду:
src/styles/astryx.css — джерело правди по токенах, src/pages/*.tsx —
реальні сторінки, src/components/ui/ — існуючі компоненти)

4. Upload Figma File — пропусти (немає Figma-файлу).

5. Import Codebase — пропусти, якщо GitHub-лінк уже додано (дублювання);
   онови, якщо форма explicitly вимагає локальний upload замість URL.

6. Upload Design Assets — пропусти, якщо немає окремих screenshot/asset-файлів
   під рукою; якщо є скріншоти конкретних неузгоджених сторінок
   (наприклад /architect, /notebooks — див. TERMINOLOGY_AUDIT в
   WORKFORCE-UI-CONSOLIDATED-PLAN.md §13), прикріпи їх тут.

Натисни Create.

Після створення — зроби скріншот результату і зупинись, чекай наступного
промту (він піде в чат самої дизайн-системи, не в цю форму).
```

---

## Після Create — використай GENSPARK-PROMPTS.md

Три готові промти (`GENSPARK-PROMPTS.md`, той самий каталог) вставляються
ПО ЧЕРЗІ в чат щойно створеної Genspark-дизайн-системи:
1. Контекст і жорсткі межі (Astryx-токени, не чіпати бізнес-логіку)
2. Причина стильової неузгодженості (`.astryx-migrated` bridge-клас,
   незавершена міграція)
3. Worker-facing майбутнє (контекст на потім, не негайна задача)

Не вставляй усі три одразу одним повідомленням — кожен окремим ходом чату,
дай Genspark відповісти/підтвердити розуміння між ними.

## Правила для Comet-агента

- НЕ клацай "Create" на жодній формі, що стосується РЕАЛЬНОГО коду/GitHub
  (commit, PR, push) — тільки форми самого Genspark (design system creation,
  chat).
- Якщо Genspark попросить OAuth-авторизацію до GitHub-репозиторію — це
  очікувано (потрібно для читання коду через "Link GitHub repositories"),
  підтверди звичайний read-доступ, НЕ надавай write/admin scope, якщо форма
  запитує вибір рівня доступу.
- Скріншот після кожного значного кроку (форма заповнена → Create →
  результат → кожна відповідь чату) — для ревʼю Q.
- Якщо форма/UI відрізняється від опису вище (Genspark оновив інтерфейс) —
  зупинись, повідом що саме відрізняється, не вгадуй.

---

## Крок 0.5 — що саме подати Genspark (після Create, перед промтами з GENSPARK-PROMPTS.md)

Repo тепер має 2 додаткові документи поза формою: `REDESIGN-BRIEF.md`
(структурований бриф: цілі, IA, component inventory, phased plan) і
`astryx-consistency-spec.html` (живий HTML-референс з light/dark toggle,
before/after картка того самого компонента). Обидва вже доступні Genspark
через GitHub-лінк з форми (Крок 1) — окремо завантажувати НЕ треба.

## Промт для Comet — крок 0.5 (дай ПЕРЕД GENSPARK-PROMPTS.md промт 1)

```
Перед тим як переходити до брифінгу з GENSPARK-PROMPTS.md, звернись до двох
файлів, вже доступних через підключений GitHub-репозиторій:

1. docs/plans/genspark-astryx-redesign/REDESIGN-BRIEF.md -- прочитай
   секції 4-8 (affected pages, IA, component inventory, phased plan).
   Це не пропозиція, а вже узгоджений скоуп -- не став під сумнів
   must-build-now/nice-to-have розподіл.

2. docs/plans/genspark-astryx-redesign/astryx-consistency-spec.html --
   відкрий цей файл у браузері (raw GitHub посилання або локально), це
   живий приклад того самого компонента до і після токенізації. Секція
   03 -- саме та трансформація, яку треба повторити на кожній
   неузгодженій сторінці. Не копіюй її дизайн буквально -- вона
   ілюструє ПРИНЦИП (яка палітра/радіус/шрифт), не готовий макет.
```
