# AI-Drakon Problem Map — UAV Watcher Audit
> Date: 2026-05-31 | Auditor: Claude (architect) + AGY3 (tester)
> Sprint2 update: 2026-05-31 | Based on TASK-107/108 testing
> Screenshots: docs/screenshots/task96/ + docs/uav-watcher-analysis/screenshots/

---

## CRITICAL (блокує роботу)

- [ ] **Code section: "Не вдалося завантажити"**
  - Де: `/code` → ліва панель "UAV-WATCHER" → файл "uav-watcher"
  - Причина: GitHub token порожній в Settings (Personal Access Token not set)
  - Репро: Settings → GitHub → Token field empty → /code → "Не вдалося завантажити"
  - Фікс: 1) UI треба показувати зрозуміле повідомлення "Token not configured, go to Settings"
            2) Або зробити кнопку "Налаштувати" що веде на Settings
  - Файли: `src/pages/code.tsx` або `src/components/CodeEditor*`

- [ ] **OpenDesign недоступний**
  - Де: `http://192.168.3.234:7459` → ERR_CONNECTION_REFUSED
  - Причина: сервіс не запущений на RPi
  - Фікс: запустити OpenDesign сервіс (`sudo rc-service opendesign start` або docker)

---

## HIGH (заважає роботі)

- [ ] **Code→DRAKON: відсутній feedback після "Аналізувати"** *(Sprint2, TASK-107)*
  - Де: `/code` → кнопка "Аналізувати" → нічого не відбувається візуально
  - Проблема: pipeline запускається (API повертає job_id), але UI не показує loading state або progress
  - Репро: натиснути "Аналізувати" → жодного spinner/toast/статусу → не зрозуміло чи аналіз почався
  - Фікс: показувати loading spinner + polling статусу + toast "Аналіз завершено" з посиланням на /diagrams
  - Файли: `src/pages/code.tsx`, `src/components/AnalyzeButton*`

- [ ] **Architect agent: "Агент тимчасово недоступний" без debug-info** *(Sprint2, TASK-108)*
  - Де: `/chat` або `/agents` → Architect agent
  - Причина: PROXY_TOKEN="" (empty) → httpx відхиляє `Authorization: Bearer ` header → HTTP 500
  - Проблема: UI показує лише "тимчасово недоступний" без деталей помилки, складно діагностувати
  - Фікс: відображати server-side error code (не повне повідомлення, але клас помилки — config/network/timeout)
  - Файли: `src/pages/agents.tsx`, `services/architect-agent/main.py` (error response format)

- [ ] **Post-analysis: діаграма не з'являється автоматично в /diagrams** *(Sprint2, TASK-107)*
  - Де: після успішного "Аналізувати" в /code
  - Проблема: нова DRAKON-схема генерується, але список /diagrams не оновлюється без ручної навігації
  - Фікс: після polling "done" — автоматичний redirect або toast "Схему створено → [Відкрити]"
  - Файли: `src/pages/code.tsx`, `src/pages/diagrams.tsx`

- [ ] **Agents: модель невідома / drakon-assistant-proxy**
  - Де: `/agents` → Inspector → "за замовчуванням: OpenAI" + "drakon-assistant-proxy → модель невідома"
  - Проблема: proxy не налаштований, модель не визначена → агент може не працювати
  - Фікс: Settings → Agents → налаштувати URL проксі та модель

- [ ] **Code section не має fallback UI**
  - Коли GitHub token порожній, показує тільки "Не вдалося завантажити" без пояснення
  - Немає кнопки "Налаштувати" або лінку на Settings
  - UX: користувач не знає що робити

- [ ] **Agents: немає кнопки "Run" для окремого агента**
  - Видно breakpoints (measure_cc, classify, ast_translate, yaml_gen, validate, ir_gen)
  - Незрозуміло як запустити агента без pipeline контексту
  - Chat поле внизу каже "Вставте Python-код" — але це неочевидно для нових користувачів

---

## MEDIUM (незручно)

- [ ] **Pipeline: немає проекту "UAV-Watcher"**
  - Активний проект: "En_ukrainien" (тестовий)
  - Для роботи з uav-watcher потрібен новий проект
  - Фікс: додати кнопку "New Project" чітко видиму в лівій панелі

- [ ] **Diagrams: невідомі символи в назві схеми**
  - Схема "SlotRouter â㎝ score_candidate..." — encoding issue в назві
  - Схема показує Юнікод сміття замість правильного тексту
  - Файли: `src/routes/diagrams.tsx` або DB schema

- [ ] **Notes: секція порожня і неінтерактивна**
  - `/notes` — пуста сторінка без пояснення що тут робити
  - Немає "Create note" або прикладу

- [ ] **Pipeline scenarios: немає preview**
  - 7 сценаріїв (Код→Генерація, Рефакторинг тощо) але немає preview/опису
  - Користувач не знає що очікувати від кожного сценарію

---

## LOW (дрібниці)

- [ ] **Diagrams: старі схеми мають garbled назви після UTF-8 fix** *(Sprint2)*
  - Де: `/diagrams` → список схем
  - Причина: Worker раніше декодував base64 як Latin-1 → Кирилиця у назвах збережена некоректно в БД
  - Фікс: міграція існуючих записів або кнопка "Rename" у списку схем
  - Файли: DB migration script, `src/pages/diagrams.tsx`

- [ ] **Settings: Personal Access Token не валідується при збереженні**
  - Можна зберегти порожній токен без попередження
  - Фікс: перевіряти формат ghp_*** при введенні

- [ ] **"/pipeline" (singular) → 404** — вже виправлено redirect у TASK-97

- [ ] **Agents chat: placeholder "Вставте Python-функцію..."**
  - Для UAV-Watcher потрібен інший контекст, не Python-функція
  - Placeholder надто специфічний

---

## WORKING WELL (що добре)

- ✅ **Pipeline editor** — 7 готових сценаріїв, 6-крокова pipeline (Код→Аналіз→IR→Редагування→Генерація→Результат)
- ✅ **Agents section** — 5 агентів: Pipeline A & B (DRAKON IR), Sharon Consultant API, Sharon LangGraph Pipeline, Sharon Shelter Search
- ✅ **DRAKON Diagrams** — редактор схем працює, є існуюча SlotRouter схема
- ✅ **Login** — owner/drakon-mcp-2026 працює
- ✅ **GitHub Settings** — repo `maxfraieho/uav-watcher` встановлено (токен потрібен)
- ✅ **Navigation** — всі маршрути доступні (після TASK-97 fix)
- ✅ **DRAKON agent chat** — відповідає "Готово. Вставте Python-код — згенерую DRAKON-схему"
- ✅ **Code editor Cyrillic** — виправлено в Sprint2 (Worker: atob→TextDecoder UTF-8, TASK-107)
- ✅ **Architect agent /chat** — виправлено в Sprint2 (PROXY_TOKEN fallback "freecc", TASK-108)
- ✅ **Pipeline API** — `architect-agent:8766/pipeline/analyze` повертає DRAKON IR за 45с для 3 uav-watcher flows

---

## MISSING FEATURES (чого не вистачає для uav-watcher)

- [ ] **Немає підтримки Python uav-watcher проекту** — Code section очікує GitHub token для читання файлів
- [ ] **Немає DRAKON схем для uav-watcher** — потрібно створити:
  - Threat Detection Pipeline: Telegram → GeoFilter → LangGraph → Alert
  - AllClear Sync: catchup_history → detect missed → update state
  - Sharon Consultant: query → LangGraph RAG → response
  - Shelter Search: location → Overpass API → shelters
- [ ] **OpenDesign інтеграція** — не запущений, потрібен для UI дизайну
- [ ] **Немає проекту "UAV-Watcher"** — активний проект "En_ukrainien" не пов'язаний

---

## NEXT STEPS — План виправлення

### Термінові (можна зробити зараз)
1. **TASK-99**: Виправити Code section — показувати зрозумілий error коли token порожній
2. **TASK-100**: Запустити OpenDesign на RPi (docker або systemd)
3. **TASK-101**: Створити проект "UAV-Watcher" в ai-drakon + перші DRAKON схеми

### Короткострокові (наступний спринт)
4. **TASK-102**: Налаштувати drakon-assistant-proxy з правильною моделлю
5. **TASK-103**: UI покращення — Notes section, Pipeline previews, Agent UX
6. **TASK-104**: Encoding fix для назв DRAKON схем (UTF-8 issue)

### Sprint2 виявлені (пріоритет HIGH)
7. **TASK-110**: Loading state для "Аналізувати" + polling UI + toast "Схему створено → [Відкрити]"
8. **TASK-111**: Architect agent error response — показувати клас помилки (config/network/timeout) замість "тимчасово недоступний"
9. **TASK-112**: Post-analysis auto-redirect або notification після завершення pipeline job

### Стратегічні
- Встановити GitHub Personal Access Token для uav-watcher repo
- Протестувати DRAKON agent з реальним Python-кодом uav-watcher
- Інтегрувати OpenDesign для дизайну ui покращень

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[INDEX]] — переглянути всі документи розділу