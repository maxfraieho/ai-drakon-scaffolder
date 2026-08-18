# Флот агентів AI-DRAKON — координація та інфраструктура

> Мігровано з `MASTER-CONTEXT.md` (2026-06-30) при впровадженні SDD
> (specs/000-baseline, Фаза 3 brownfield-гайду — Two-Speed Adoption,
> координація multi-agent). Дублікат живих статусів/задач з оригіналу
> НЕ переносився — тут лише довговічна довідкова інформація (ролі,
> адреси, можливості). Актуальний робочий стан фічі — `.specify/feature.json`.

## Вузли розробки

| Вузол | IP | Роль |
|---|---|---|
| **OrangePi PC2 (Alpha)** | 192.168.3.161 | Оркестратор сесій, планувальник та виконавець |
| **rpi3b / dev-сервер (Beta)** | 192.168.3.234 (agent) / 192.168.3.184 (служби) | Виконавець, Frontend/UI, хостинг служб |
| **AGY2** | 192.168.3.30 | Виконавець коду (Windows-ноутбук) |
| **AGY3** | 192.168.3.204 | Резервний виконавець (планшет) |
| **AGY phone** | 192.168.3.195 | Тестування та швидкі зміни (телефон) |

> Статуси Active/Pending/Inactive в оригіналі MASTER-CONTEXT.md були
> точкою в часі на 2026-06-30 — НЕ вважай їх актуальними без перевірки.

## Можливості вузла dev-сервер (192.168.3.184)

- **Служби та бази даних:** MemPalace (ChromaDB) на порту `49374`, GitNexus Code Intelligence на порту `4747`.
- **Backend-мікросервіси (FastAPI):** `architect-agent` (порт `8766`), `drakon-agent` (порт `8765`), `docs-agent` (порт `8767`). **Працюють з `~/workspace/ai-drakon-scaffolder/services/*`** — окремий чекаут репозиторію, ЗАСТАРІЛИЙ відносно `~/projects/ai-drakon-scaffolder` (де ведеться SDD-робота) станом на 2026-08-18. Синхронізація цих двох чекаутів — відкрите питання, не вирішене автоматично.
- **Хмарні функції:** `deterministic-engine` розгорнутий як Appwrite Function.

## Доступні MCP-сервери

- **GitNexus MCP (`gitnexus`)** — аналіз зв'язків у коді, blast radius (`impact`), семантичний пошук, виявлення регресій (`detect_changes`). **Індексує `~/workspace/ai-drakon-scaffolder`** (застарілий чекаут) — врахуй це, коли результати запиту виглядають "не знаходить" нового SDD/ADR-коду.
- **MemPalace MCP (`mempalace`)** — контекст розробки, щоденники агентів (`diary_write`/`diary_read`).
- **NotebookLM MCP (`notebooklm`)** — блокноти й аналіз документації.

## Ключові довідкові файли (оригінальні шляхи можуть бути застарілі)

- `CONTEXT.md` — domain glossary, DRAKON JSON-формат, архітектура (корінь репо).
- `development/plans/2026-06-27-manual-testing-playbook.md` — ручний тест-план (перевір актуальність).
- `src/lib/harness/harness-spec.ts` — специфікація test harness.

## Репозиторій

- GitHub: https://github.com/maxfraieho/ai-drakon-scaffolder
- Deployed: https://ai-drakon-scaffolder.pages.dev
