# AI-Drakon UI Analysis for UAV Watcher (TASK-96)

> Дата: 2026-05-31 | Зібрано: OrangePi через agent-workspace MCP + CDP

## Поточний стан UI

### Diagrams (/diagrams) ✅
- Активний проект: **En_ukrainien**
- Є існуюча DRAKON схема: `SlotRouter → score_candidate(candidate, health, task_type)`
- Схема показує логіку: capability_score + health.state check + state==degraded? branch
- Sidebar розділи: Pipeline, Схеми (активний), Код, Нотатки | Агенти, Налаштування
- Dev Cycle: DRAKON • ARCHITECT • DOCS

### Pipeline (/pipeline) ❌ BUG
- **404 "Page not found"** — маршрут є в навігації але сторінка не реалізована
- Це критичний баг: посилання в головному меню веде на 404

### Агенти (/agents) ✅
- **Вже налаштовані агенти для Sharon/uav-watcher:**
  - `Sharon LangGraph Pipeline` (клас: Аналіс...)
  - `Sharon Shelter Search`
- **Execution points:** measure, clas., ast_translate, yaml_gen, validate, ir_gen
- **Backend:** OpenAI | drakon-assistant-proxy → модель невідома
- **Input:** "Вставте Python-функцію..." — підтримує Python функції
- **KONSOL VYHONANYA PAYLAYNU (LANGGRAPH SSE STREAM)** — лог виконання в реальному часі
- **Попередження браузера:** app запитує доступ до локальної мережі (для backend 192.168.3.184)

### Налаштування (/settings) ✅
- Tabs: **GitHub**, Агенти, Документація, n8n, MinIO, Додаток
- **GitHub repo:** maxfraieho / **drakon-setup-hub** / main ← НЕПРАВИЛЬНЕ репо
- Personal Access Token: **порожній** (статус: "Не перевірено")
- Потрібні права: repo (read + write contents)

## Критичні баги

| # | Баг | Пріоритет |
|---|-----|-----------|
| 1 | `/pipeline` → 404 Page not found | HIGH |
| 2 | GitHub Settings: repo = `drakon-setup-hub` замість `uav-watcher` | HIGH |
| 3 | GitHub Personal Access Token порожній | HIGH |

## Що добре працює

- Login flow (owner / drakon-mcp-2026) ✅
- Diagrams editor з DRAKON схемами ✅
- Агенти Sharon LangGraph + Shelter Search вже налаштовані ✅
- Налаштування UI з вкладками ✅
- LangGraph SSE stream консоль ✅

## Що потрібно для uav-watcher

### 1. Виправити `/pipeline` route
```bash
# Знайти маршрут в src/App.tsx або router config
grep -r "pipeline" ~/workspace/ai-drakon-scaffolder/src/ --include="*.tsx" | grep -i "route\|path"
```

### 2. Підключити правильний репо в Налаштуваннях
- Repository: `maxfraieho/uav-watcher`
- Branch: `master`
- Token: потрібно додати GitHub PAT

### 3. Створити проект "UAV Watcher" в ai-drakon
Поточний проект: En_ukrainien. Потрібно:
- Створити новий проект через UI (кнопка біля "ACTIVE PROJECT")
- Назва: "UAV Watcher — Sharon System"

### 4. Рекомендовані DRAKON схеми для uav-watcher

**4a. Threat Detection Pipeline**
```
Telegram message → Filter (is_threat_channel?) → AI Classifier → 
  threat_level? → HIGH: send_alert() → track_active_threat()
               → LOW: log_only()
```

**4b. AllClear Sync (catchup_history)**
```
startup → fetch_recent_history(2h) → sort_chronologically() →
  for each message: is_allclear? → YES: update_active_threat(False) + notify_late()
                                → NO: skip
```

**4c. Sharon Consultant Flow**
```
user_query → route_intent() → 
  shelter_search: OSM_query → format_results → send_to_user
  threat_status: get_active_threat() → format_status → send_to_user
  general: LangGraph_RAG → send_to_user
```

**4d. Shelter Search**
```
location_share → parse_geo(lat, lon) → 
  search_OSM(radius=2km) → filter_shelters() → 
  format_list → send_telegram_message
```

## Наступні кроки

1. **TASK-97**: Виправити `/pipeline` 404 — знайти і додати маршрут в router
2. **TASK-98**: Налаштування → GitHub → підключити `uav-watcher` repo
3. **TASK-99**: Створити DRAKON схеми для uav-watcher в ai-drakon editor

## Висновок

ai-drakon **готовий до роботи** з uav-watcher. Агенти Sharon вже є в системі.
Головний блокер: `/pipeline` 404 + GitHub не підключений до правильного репо.
Після виправлення цих двох проблем можна одразу починати роботу в UI.
