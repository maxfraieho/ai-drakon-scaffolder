# SESSION STATE — 2026-05-16

## Машини
| Машина | Роль | Доступ |
|--------|------|--------|
| 192.168.3.184 (Alpine Linux) | Dev server, репозиторії, PinchTab | `sshpass -p '805235io.' ssh vokov@192.168.3.184` |
| 192.168.3.161 (Orange Pi PC2) | Claude Code сесії AI-DRAKON | pass `805335io` (без крапки!) |
| 192.168.3.172 | welcome-page-pro + CF Worker | окремий проект |

## Репозиторії
| Репо | URL | Шлях на 192.168.3.184 |
|------|-----|-----------------------|
| ai-drakon-setup | github.com/maxfraieho/ai-drakon-setup | `~/workspace/ai-drakon-setup/` |
| drakon-flow-90aa2999 | github.com/maxfraieho/drakon-flow-90aa2999 | `~/workspace/drakon-flow-90aa2999/` |

**КРИТИЧНО:** Після будь-яких змін пушити в ОБИДВА репо.
**КРИТИЧНО:** Завжди редагувати `.lovable/src/` (не `src/`). Після змін синхронізувати `src/ → .lovable/src/`.
CF Pages будує з `.lovable/src/`.

## Live URLs
- UI: https://ai-drakon-setup.pages.dev/
- Worker: https://drakon-mcp-worker.maxfraieho.workers.dev
- Login: https://ai-drakon-setup.pages.dev/login

## Стан Спринтів

| Sprint | Опис | Стан |
|--------|------|------|
| Sprint 0 | Bug fixes | ✅ |
| Sprint 1 | SSE Streaming | ✅ верифіковано PinchTab |
| **Sprint 2** | Monaco Editor + localStorage History | ⚠️ РЕАЛІЗОВАНО LOVABLE, ВЕРИФІКАЦІЯ НЕ ЗАВЕРШЕНА |
| Sprint 3 | KB Integration (SQLite + RAG) | ⏳ |

## Sprint 2 — Що зробив Lovable (коміт цієї сесії)

Lovable відписав що зробив:
- `CodeGenerationPanel.tsx` переписано за Stitch-дизайном
- Idle state: форма + history panel 320px
- Done state: Monaco Editor замість `<pre>` + status bar
- Header: мовний перемикач (PY/TS/JS)
- `src/lib/pipeline-history.ts` — localStorage (max 20)
- Тільки одна панель (нижня/права) відкрита одночасно
- `.lovable/src/` синхронізовано

**Build: ✅ успішний на CF Pages**

## Верифікація — НЕЗАВЕРШЕНА ⚠️

PinchTab показав що панель технічно відкривається (accessibility tree: кнопка змінилась на "Закрити генерацію коду"), але скріншоти показують порожній canvas без bottom panel.

**Можлива причина:** панель відкрилась нижче fold (треба скролити вниз) або у viewport є баг.

**Що треба перевірити:** → детально в `VERIFICATION_CHECKLIST.md`

## Промти для Lovable

| Файл | Опис | Стан |
|------|------|------|
| `lovable-prompts/32-ui-polish-codegen.md` | UI polish 7 tasks | **ПРОПУСТИТИ** — все покрив 33 |
| `lovable-prompts/33-stitch-codegen-implementation.md` | ✅ **ВІДПРАВЛЕНО Lovable** | Реалізовано |
| `lovable-prompts/00-stitch-lovable-template.md` | Стандарт для майбутніх промтів | Шаблон |

## Архітектурні інваріанти
- `drakonwidget.js` — НЕ ЧІПАТИ НІКОЛИ
- IR без X/Y координат
- Нові типи тільки з optional fields
- FIFO для всіх мутацій діаграми
