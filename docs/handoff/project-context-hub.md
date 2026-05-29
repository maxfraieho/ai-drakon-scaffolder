---
title: "Project Context Hub — єдине джерело правди проекту"
created: 2026-05-29
tier: 2
lang: uk
---

# Project Context Hub

> **Проблема:** зараз в AI-DRAKON немає єдиного джерела правди для проекту.
> Кожен workspace ізольований — агент-чат не знає що відкрито в редакторі,
> KB не синхронізована з репозиторієм, пайплайни живуть окремо від коду.
>
> **Рішення:** обрав проект → автоматично підтягнувся репозиторій, KB,
> агенти, пайплайни → все доступно скрізь.

## Семантичні зв'язки
[[handoff/_INDEX]] [[handoff/sharon-uav-handoff]] [[concept/03-architecture]]

---

## 1. UX Flow — як має працювати

```
[Платформа відкрита]
        ↓
[ProjectSelector у топ-барі]
  ↓ обрав existing     ↓ створив новий
  └─ load config       └─ ввів slug + GitHub URL
          ↓                    ↓
   /projects/{slug}/sync    POST /projects/{slug}/init
          ↓                    ↓
   git pull ────────────── git clone
          ↓
   [CodeIndexer: repo → KB chunks]
          ↓
   [Завантаження агентів та пайплайнів]
          ↓
   [GlobalProjectContext.set(slug)]
          ↓
   ┌──────────────────────────────┐
   │  Всі workspace оновились:   │
   │  • AgentChat → бачить KB    │
   │  • DrakonEditor → пайплайни │
   │  • CodeViewer → repo/       │
   │  • Settings → config.json   │
   └──────────────────────────────┘
```

**Ключовий принцип:** зміна `currentProject` в одному місці → всі компоненти
реагують через React Context / Zustand store.

---

## 2. Структура даних проекту на сервері

```
~/projects/{slug}/
  config.json              ← єдине джерело конфігу проекту
  repo/                    ← git clone репозиторію (auto-sync)
  agents/
    {agent-name}/
      pipeline.drakon.json ← DRAKON IR (source of truth)
      kb/                  ← база знань агента (MD файли)
  .last_sync               ← ISO timestamp останнього git pull
  .index_hash              ← hash KB для інкрементної індексації
```

**config.json:**
```json
{
  "slug": "sharon-uav",
  "name": "Sharon UAV Watcher",
  "repo_url": "https://github.com/maxfraieho/uav-watcher",
  "branch": "master",
  "auto_sync": true,
  "sync_interval_min": 30,
  "created_at": "2026-05-29T12:00:00Z"
}
```

---

## 3. Gap Analysis — чого зараз не вистачає

| Компонент | Стан | Пріоритет |
|-----------|------|-----------|
| `ProjectContext` (React global state) | ❌ немає | P1 |
| `ProjectSelector` UI компонент | ❌ немає | P1 |
| `POST /projects/{slug}/init` — clone repo | ❌ немає | P1 |
| `POST /projects/{slug}/sync` — pull + reindex | ❌ немає | P2 |
| `CodeIndexer` — repo → KB chunks | ❌ немає | P2 |
| `GET /projects` — список проектів | ❌ немає | P1 |
| Per-project агенти | ✅ є | — |
| Per-project KB | ✅ є | — |
| Pipeline CRUD API | ✅ є | — |

**Найкритичніший gap:** глобальний `ProjectContext` у фронтенді.

---

## 4. DRAKON-схема: логіка "Project Load"

```
СТАРТ
  │
  ▼
[Отримати slug від UI]
  │
  ▼
[config.json існує?] ── Ні ──→ [Помилка: проект не існує] → СТОП
  │ Так
  ▼
[repo/ існує?]
  │ Ні ──────────────────────────────────────────────┐
  │ Так                                              ▼
  ▼                                           [git clone]
[git pull]                                          │
  │ ◄──────────────────────────────────────────────┘
  ▼
[KB застаріла? (перевірити .index_hash)]
  │ Ні ──────────────────────────────────────────────┐
  │ Так                                              │
  ▼                                                 │
[CodeIndexer: repo → chunks → kb/]                 │
[Оновити .index_hash]                              │
  │ ◄──────────────────────────────────────────────┘
  ▼
[Завантажити агентів з agents/]
  │
  ▼
[GlobalProjectContext(slug, config, agents)]
  │
  ▼
[Broadcast до всіх workspace]
  │
  ▼
КІНЕЦЬ
```

---

## 5. Пріоритет реалізації

### P1 — Мінімальний робочий контекст

**Крок 1: ProjectContext (React)**
```typescript
// src/contexts/ProjectContext.tsx
interface ProjectContextType {
  currentSlug: string | null;
  setProject: (slug: string) => void;
  config: ProjectConfig | null;
  agents: string[];
  isLoading: boolean;
}
```

**Крок 2: GET /projects API (architect-agent :8766)**
```
GET  /projects           → [{slug, name, last_sync}]
GET  /projects/{slug}    → ProjectConfig
POST /projects           → init + clone
DELETE /projects/{slug}  → видалити
```

**Крок 3: ProjectSelector у топ-барі**
- Дропдаун поруч з лого
- Quick-switch між проектами
- "+" → створити новий

### P2 — Синхронізація з repo

**Крок 4: POST /projects/{slug}/sync**
```json
{"status": "synced", "commits_ahead": 3, "kb_updated": true}
```

**Крок 5: CodeIndexer (services/shared/code_indexer.py)**
```python
class CodeIndexer:
    def index_repo(self, repo_dir: Path, kb_dir: Path) -> int:
        # Scan repo, extract docstrings/types → MD chunks → KB
```

---

## 6. Цінність для розробника

**Зараз:** кожен workspace ізольований, треба вручну копіювати контекст.

**Після:** обрав проект → платформа сама зробила git pull, проіндексувала
код, завантажила агентів. Чат, редактор, перегляд коду — всі бачать один проект.

---

## 7. Наступні кроки для Q

1. Намалювати DRAKON-схему "Project Load" (розділ 4 → візуальна схема)
2. Намалювати DRAKON-схему "CodeIndexer" pipeline
3. Claude розпланує реалізацію по спринтах на основі схем
4. Делегувати P1 спринт AGY3 або Codex

## Семантичні зв'язки
[[handoff/_INDEX]] [[handoff/sharon-uav-handoff]] [[concept/03-architecture]]
