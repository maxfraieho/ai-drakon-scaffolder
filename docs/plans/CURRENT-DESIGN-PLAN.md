---
tags:
  - domain:meta
  - status:canonical
  - format:status
created: 2026-08-31
updated: 2026-08-31
tier: 1
title: "Consolidated status — active plan tracks"
lang: uk
---

# Консолідований статус — три активні треки

> Цей документ зводить три незалежні ініціативи, що накопичились у репозиторії паралельно.
> Кожна перевірена напряму (git log, live-тест, або CF API) станом на 2026-08-31.
> Не плутати треки 1 і 2 — це різні шари (візуальні токени vs інформаційна архітектура),
> вони НЕ зливаються в один план, просто йдуть паралельно.

---

## Трек 1 — Astryx/Genspark visual redesign

**Що це:** міграція хардкоджених Tailwind-кольорів (indigo/purple/emerald/rose/slate) на
`--astryx-*` CSS-токени. Не IA-зміна, тільки візуальний шар.

**Джерела:**
- `docs/plans/genspark-astryx-redesign/{PLAN.md,REDESIGN-BRIEF.md,GENSPARK-PROMPTS.md}` — на `origin/feature/genspark-astryx-redesign`
- `docs/screenshot/genspark/` (dev-184) — README.md (ground-truth spec), GAP_ANALYSIS_AGENTS.md (Pass 1), `design_handoff_astryx_agents_pass2/APPLY.md` (Pass 2)

**Статус: код-комплітний, задеплоєний на тест, НЕ змерджений в main.**

- Гілка `origin/design-system/astryx-genspark`, HEAD `2efd2ed9` (+ `2a76181d3` — security fix, див. трек 3).
- Усі 10 міграційних комітів присутні (Pass 1: `a50134dd` AgentsPage, `2730e4da` NewAgentWizard; Pass 2: `dc28f96c/f3aa10ce/b54ba75d/83baeb6f/2efd2ed9` — AgentChatPanel/AgentLlmCard/AgentStatusCard/NodePropertiesForm/StudioToolbar).
- Grep `AgentsPage.tsx` + `NewAgentWizard.tsx` на цій гілці: 0 залишків `indigo|purple|emerald|rose|slate-N`.
- **Live-перевірено** 2026-08-31 на `.30:8081` (pnpm install через corepack, vite dev): landing + login page рендеряться коректно (amber accent, flat surfaces, sentence case). `/agents` вимагає авторизації — не дійшли до звірки картки агентів проти специфікації.
- Гілка також несе не пов'язані ADR-0028 nav/GitHub-integration коміти (`57e79d63`..`cd657eae`, merge `ab5512e8`) — за словами merge-коміта, без конфліктів.

**Наступний крок:** залогінитись на `.30:8081/agents`, звірити з `GAP_ANALYSIS_AGENTS.md` + APPLY.md таблицями заміни. Потім рішення про merge в `main` (гілка вже випереджає `main` наілька комітів, `main` теж рухався — перевірити чистоту мержу).

---

## Трек 2 — Workforce Vision (ADR-0026)

**Що це:** значно більша IA-трансформація — Worker PWA (офлайн-перший, спрощений інтерфейс
для польових виконавців) + Supervisor Review + org-tree навігація. Не про кольори, про
структуру продукту.

**Статус: тільки планування, нічого не імплементовано.**

- `docs/adr/0026-organizational-ai-workforce-vision.md` — **існує**, `status: proposed`, `date: 2026-08-24`, deciders: Q + platform architecture.
- Два локальні **незакомічені** файли на dev-184: `docs/plans/WORKFORCE-UI-REDESIGN-PLAN.md` (168 рядків) і `docs/plans/WORKFORCE-UI-AND-SLICE5-PLAN.md` (128 рядків) — перевірено, це **різні** файли (не дублікати), точний розподіл скоупу між ними не звіряв рядок-в-рядок.
- `docs/plans/_INDEX.md` (на гілці `design-system/astryx-genspark`) позначає пов'язаний `plans/org-workforce-vision-2026-08-24/WORKFORCE-UI-CONSOLIDATED-PLAN` статусом `pending-Q-review`.

**Наступний крок:** незакомічені файли не втрачені, але й ніде не запушені — рішення Q: закомітити/дооформити, чи це ще чернетка. Немає коду, що торкається цього треку.

---

## Трек 3 — Security: MCP_API_KEY exposure (закрито сьогодні)

**Що було знайдено** (перевірено напряму — git blame, CF API, не з чужих слів):

- `CONTEXT.md:117` (коміт `6f7e4068a0`, 2026-06-20) документував літеральне значення bypass-токена `"drakon-mcp-2026"`.
- `src/pages/LoginPage.tsx:184-198` **хардкодив те саме значення в клієнтському коді** — два bypass-шляхи: (1) `password === "drakon-mcp-2026"`, (2) `username === "owner" && password === "805235io"/"805235io."` (SSH-пароль Q на dev-184, перевикористаний тут). Обидва потрапляли в публічний JS-бандл.
- Ротація 08-23 (`863985d131`, wrangler.toml) прибрала plaintext-змінну з `wrangler.toml` і перенесла в CF secret — але **не торкнулась** ні цього коду, ні `CONTEXT.md`, тому leak-vector лишався живим 8 днів по "ротації".
- **Другий, задокументований ніде holder того самого секрету**: воркер `drakon-mcp-worker`, задеплоєний `2026-06-30`, не в жодному `wrangler.toml` цього репо (orphan), 0 routes/cron/domains — той самий "orphan" з попереднього near-miss інциденту (2026-08-23), цього разу з'ясовано остаточно.

**Виправлено 2026-08-31:**
1. `drakon-antigravity-worker`.MCP_API_KEY — ротовано через CF API `/secrets` endpoint (точковий upsert, усі 21 binding перевірено на місці).
2. `drakon-mcp-worker` — ротовано, потім **видалено** з акаунту (підтверджено відсутність у списку скриптів).
3. `src/pages/LoginPage.tsx` — обидва bypass-блоки видалені (коміт `2a76181d3` на dev-184, гілка `design-system/astryx-genspark`, **закомічено, не запушено**).
4. `CONTEXT.md` — ADR-004 позначено `REMOVED 2026-08-31`, прибрано літеральне значення токена з 4 місць.

**Не зроблено / відкрито:**
- Коміт `2a76181d3` існує тільки на dev-184, не запушений в origin.
- Структурна проблема лишається: `worker-mcp-drakon.js:445-446` — будь-який власник bearer-токена, що збігається з `env.MCP_API_KEY`, отримує `role:'owner'` назавжди, без expiry, без scope. Ротація значення закриває поточний leak, але не змінює архітектуру. ADR-0019 (MCP exposure model) досі `proposed` — не імплементовано.
- Стара leak-стрічка `"drakon-mcp-2026"` лишається назавжди в git-історії та в раніше зібраних JS-бандлах (історичний артефакт, вже не працює проти жодного live-секрету).

---

## Джерело недовіри до цього документа

Перший чернетковий варіант цього файлу писав Oracle (Opus, віддалений хост) і давав **три
помилкові твердження**, усі спростовані прямою перевіркою:
1. "wrangler.toml все ще містить plaintext-секрет" — ні, прибрано 08-23.
2. "ADR-0026 не існує, мертвий лінк" — існує, `status: proposed`.
3. "два workforce-план-файли — байт-в-байт дублікати" — ні, різні файли.

Тому весь трек 2 і частина треку 3 у цьому документі написані заново з нуля на основі
прямої перевірки (git log/blame, CF API, live browser), а не з Oracle-звіту.
