# Genspark Prompt 4 — залишкові agent-компоненти (verified via GitNexus)

Гілка: `feature/genspark-astryx-redesign` (документ), реалізація в
`design-system/astryx-genspark`. Запускати в Comet-браузері, Genspark вже
авторизований на репозиторії `maxfraieho/ai-drakon-scaffolder` — не
перепідключай, працюй з тим, що вже підключено.

**Виправлення після перевірки GitNexus (call-graph, не здогад):** ці 5
файлів НЕ є "внутрішніми компонентами /agents" -- вони використовуються в
РІЗНИХ, незалежних місцях застосунку:

| Файл | Реальний(і) caller(и) |
|---|---|
| `AgentChatPanel.tsx` | `WorkspaceShell.tsx` (глобальний "AI-агенти" sheet, доступний всюди), `ProjectLayout.tsx`, `AgentStudioPage.tsx` |
| `AgentStatusCard.tsx` | `HomePage.tsx` -- **не /agents взагалі**, дашборд |
| `AgentLlmCard.tsx`, `NodePropertiesForm.tsx`, `StudioToolbar.tsx` | `AgentStudioPage.tsx` (+ `PropertiesPanel.tsx`) -- окрема сторінка "Agent Studio", НЕ `/agents` (той вже мігровано в PR#1) |

Це важливо для scope: `AgentChatPanel.tsx` рендериться в 3 різних
контекстах одночасно -- будь-яка зміна має лишатись чисто візуальною
(класи/токени), НЕ змінювати props/API компонента, інакше зламаєш усі 3
місця використання одночасно.

---

## Промт (копіювати в Genspark-чат одним повідомленням)

```
Продовжуємо Astryx-міграцію в репозиторії maxfraieho/ai-drakon-scaffolder,
гілка design-system/astryx-genspark. Ти вже робив /agents (AgentsPage.tsx +
NewAgentWizard.tsx) -- тепер 5 інших файлів з тієї ж папки src/components/agents/,
досі з hardcoded Tailwind-кольорами замість Astryx-токенів.

ВАЖЛИВО -- ці 5 файлів НЕ є внутрішніми компонентами /agents (перевірено
call-graph аналізом, не здогад):
- AgentChatPanel.tsx рендериться в 3 РІЗНИХ місцях одночасно: глобальний
  "AI-агенти" sheet (WorkspaceShell.tsx, доступний з будь-якої сторінки),
  ProjectLayout.tsx, і AgentStudioPage.tsx.
- AgentStatusCard.tsx використовується тільки в HomePage.tsx (дашборд,
  не /agents).
- AgentLlmCard.tsx, NodePropertiesForm.tsx, StudioToolbar.tsx належать
  окремій сторінці "Agent Studio" (AgentStudioPage.tsx) -- НЕ /agents.

ЖОРСТКІ МЕЖІ (ті самі, що в попередньому проході):
1. НЕ змінюй бізнес-логіку, роути, API-виклики, назви пропсів/функцій,
   обробники подій.
2. НЕ чіпай AgentsPage.tsx / NewAgentWizard.tsx повторно -- вони вже готові.
3. Тільки візуальний шар: кольори -> --astryx-* токени, spacing, typography.
4. Результат має підтримувати light/dark theme.
5. AgentChatPanel.tsx особливо: зміни мають бути ЧИСТО візуальні (класи),
   НЕ чіпай props/структуру компонента -- він рендериться в 3 різних
   контекстах одночасно, зміна API зламає всі три.

РІВНО 5 ФАЙЛІВ для цього проходу (прочитай кожен з репозиторію напряму):
1. src/components/agents/AgentChatPanel.tsx
2. src/components/agents/AgentLlmCard.tsx
3. src/components/agents/AgentStatusCard.tsx
4. src/components/agents/NodePropertiesForm.tsx
5. src/components/agents/StudioToolbar.tsx

Підтверджені hardcoded-паттерни в кожному (не єдині, знайди решту сам
читанням файлу):
- AgentChatPanel.tsx:197 -- health[id] ? "bg-emerald-500" : "bg-red-500"
- AgentChatPanel.tsx:269,282 -- "font-mono text-emerald-600 dark:text-emerald-400"
- AgentLlmCard.tsx:108-110 -- dot: "bg-emerald-500", chipBg:
  "bg-emerald-500/10", chipText: "text-emerald-600 dark:text-emerald-400"
- AgentLlmCard.tsx:245-246 -- "bg-emerald-500/10 text-emerald-600 ..." /
  "bg-red-500/10 text-red-600 ..." (успіх/помилка пара)
- AgentStatusCard.tsx:16-17 -- online: 'bg-emerald-500', offline: 'bg-rose-500'
- AgentStatusCard.tsx:87 -- "text-indigo-400 hover:text-indigo-300"
- NodePropertiesForm.tsx:179 -- "bg-emerald-600 hover:bg-emerald-700 text-white"
- StudioToolbar.tsx:60 -- "bg-emerald-600 hover:bg-emerald-700 text-white"

ВАЖЛИВО -- вже готові semantic-токени для СТАТУСНИХ станів (додані в
попередньому проході, src/styles/astryx.css, light+dark обидва визначені):
  --astryx-semantic-ok-bg / --astryx-semantic-ok-fg       (успіх/online -- заміна emerald)
  --astryx-semantic-critical-bg / --astryx-semantic-critical-fg  (помилка/offline -- заміна red/rose)
  --astryx-semantic-warn-bg / --astryx-semantic-warn-fg   (попередження)
  --astryx-semantic-info-bg / --astryx-semantic-info-fg   (інфо/лінки -- кандидат для indigo)

Усі emerald/red/rose "статус-крапка" та "success/error chip" паттерни в цих
5 файлах МАЮТЬ мапитись саме на ці 4 токени -- не вигадуй нові, не
залишай hardcoded. Якщо знайдеш колір без відповідного semantic-токена
(не статус, не success/error/warn/info) -- використай базові --astryx-*
токени (surface/text/border, як в /agents-проході) або запропонуй одне
точкове розширення з поясненням чому жоден існуючий не підходить.

РЕЗУЛЬТАТ -- та сама структура, що минулого разу (README.md з точним
описом кожної заміни, APPLY.md з git-командами, patched-source/ з повними
файлами для прямого drop-in). Я (Claude) застосую точково з ручною
звіркою diff, як з попереднім PR -- тому кожна заміна в README має бути
явна: було X, стало Y, чому.

Якщо в процесі знайдеш ще hardcoded-кольори поза списком вище в цих САМЕ
5 файлах -- виправ і їх, це очікувано (список -- підтверджені приклади,
не вичерпний). Якщо вважаєш, що якийсь з 5 файлів варто пропустити чи
розширити список ще одним файлом з тієї ж папки src/components/agents/ --
напиши окремо чому в README, я вирішу перед застосуванням.
```

---

## Після отримання результату (для Q)

Скинь мені (Claude) готовий README.md/APPLY.md/patched-source/ -- та сама
папка `docs/screenshot/genspark/`, я звірю diff проти живого коду
(`.astryx-semantic-*` мапінг, business-логіку не займав) і застосую тим
самим способом, що PR#1.
