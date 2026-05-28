---
tags:
  - domain:agent
  - status:active
  - format:plan
created: 2026-05-26
updated: 2026-05-28
tier: 3
title: "AGY Skill 04 — PinchTab Execution: Phase 2"
lang: uk
---

# AGY Skill 04 — PinchTab Test Execution (Phase 2)

> **Виконавча фаза.** Запустити всі тест-кейси з `2026-05-26-pinchtab-test-plan.md` через PinchTab MCP.  
> Спочатку — DOM-розвідка для верифікації селекторів. Потім — тести по пріоритету.  
> Після кожного тесту: screenshot + лог результату. В кінці — запис звіту.

---

## Конфігурація

| Параметр | Значення |
|----------|---------|
| Target URL | `https://ai-drakon-scaffolder.pages.dev/` |
| Login | `owner` / `805235io` |
| Worker URL | `https://drakon-mcp-worker.maxfraieho.workers.dev` |
| PinchTab host | `192.168.3.184` |
| Скріншоти | `/tmp/pinchtab-tests/` на 192.168.3.184 |

---

## Крок 0: Pre-flight

### 0.1 Перевірити PinchTab health
```
pinchtab_health()
```
Очікування: відповідь з версією та статусом `ok`.

### 0.2 Відкрити або знайти вкладку
```
pinchtab_list_tabs()
```
Якщо вкладок немає — `pinchtab_navigate` до `about:blank` відкриє нову.

### 0.3 Підготувати директорію для скріншотів
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "mkdir -p /tmp/pinchtab-tests"
```

---

## Крок 1: DOM Recon (ОБОВ'ЯЗКОВО перед тестами)

> Мета: верифікувати фактичні селектори, не покладатися на гіпотетичні з плану.

### 1.1 Snapshot сторінки `/login`
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/login")
pinchtab_wait_for_load()
pinchtab_snapshot()
```
З відповіді зафіксувати:
- Фактичний селектор поля пароля (чи це `input[type="password"]` або `input[placeholder="..."]`)
- Фактичний текст кнопки входу (чи це `"Увійти"` чи щось інше)
- Наявність поля `username`/`email` (якщо є)

### 1.2 Авторизуватися для recon захищених сторінок
```
pinchtab_fill("input[type='password']", "805235io")
pinchtab_click("button[type='submit']")
pinchtab_wait_for_url("**/diagrams**")
```
Якщо `button[type='submit']` не спрацював — спробувати:
```
pinchtab_find("button")
```
і клікнути на кнопку з текстом, що містить "вход" або "login" або "увійти" (без урахування регістру).

### 1.3 Snapshot сторінки `/diagrams`
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/diagrams")
pinchtab_wait_for_load()
pinchtab_snapshot()
pinchtab_screenshot()
```
Зафіксувати:
- Чи є `.diagrams-left-panel` або інший клас лівої панелі
- Фактичний ID/клас контейнера DRAKON-редактора
- Текст кнопки "Нова схема" — точний рядок
- Структура навігаційного сайдбару — посилання

### 1.4 Snapshot сторінки `/settings`
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/settings")
pinchtab_wait_for_load()
pinchtab_snapshot()
```
Зафіксувати:
- Селектор поля Worker URL
- Наявність/відсутність `data-testid="save-settings"` на кнопці збереження
- Фактичний текст кнопки збереження

### 1.5 Snapshot сторінки `/code`
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/code")
pinchtab_wait_for_load()
pinchtab_snapshot()
```
Зафіксувати:
- Чи є окрема `textarea` або Monaco Editor (`div.monaco-editor`)
- Фактичний текст кнопки аналізу (Pipeline A)

### 1.6 Snapshot сторінки `/docs`
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/docs")
pinchtab_wait_for_load()
pinchtab_snapshot()
```
Зафіксувати структуру DQL-форми.

> **СТОП після recon.** Перед виконанням тестів — оновити всі гіпотетичні селектори з плану на фактичні. Якщо селектор у плані не відповідає DOM — використовувати знайдений.

---

## Крок 2: Тести AUTH (Пріоритет 1)

> Важливо: між тестами AUTH-01 і AUTH-03 очищати localStorage через JS eval.

### Допоміжна функція: очистити стан
```javascript
// Виконати через pinchtab_eval:
localStorage.clear(); sessionStorage.clear();
```

### TEST-AUTH-01: Redirect на /login без JWT
```
# Очистити стан
pinchtab_eval("localStorage.clear(); sessionStorage.clear();")

# Перейти на /
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/")
pinchtab_wait_for_load()

# Перевірити URL
pinchtab_eval("window.location.pathname")
# Очікується: "/login"

# Перевірити наявність форми
pinchtab_find("input[type='password']")
# Очікується: знайдено хоч один елемент

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо URL = /login AND поле пароля знайдено
```

### TEST-AUTH-02: Redirect /diagrams без JWT
```
pinchtab_eval("localStorage.clear(); sessionStorage.clear();")
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/diagrams")
pinchtab_wait_for_load()
pinchtab_eval("window.location.pathname")
# Очікується: "/login"
pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо URL = /login
```

### TEST-AUTH-03: Успішний логін
```
# Переконатися що на /login з чистим localStorage
pinchtab_eval("localStorage.clear(); sessionStorage.clear();")
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/login")
pinchtab_wait_for_load()

# Заповнити пароль (з recon-знайденим селектором)
pinchtab_fill("[SELECTOR_FROM_RECON]", "805235io")
pinchtab_click("[SUBMIT_BUTTON_FROM_RECON]")

# Чекати редирект (макс 3000 мс)
pinchtab_wait_for_url("**/diagrams**")

# Перевірити JWT
pinchtab_eval("localStorage.getItem('clientJwt')")
# Очікується: непустий рядок (JWT токен)

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо URL = /diagrams AND clientJwt != null
```

### TEST-AUTH-04: Невалідний пароль
```
pinchtab_eval("localStorage.clear(); sessionStorage.clear();")
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/login")
pinchtab_wait_for_load()
pinchtab_fill("[SELECTOR_FROM_RECON]", "wrong_password_xyz")
pinchtab_click("[SUBMIT_BUTTON_FROM_RECON]")

# Чекати 2000 мс (не має бути редиректу)
pinchtab_wait(2000)

# Перевірити URL — має залишитись /login
pinchtab_eval("window.location.pathname")
# Очікується: "/login"

# Перевірити відсутність JWT
pinchtab_eval("localStorage.getItem('clientJwt')")
# Очікується: null

# Перевірити наявність повідомлення про помилку
pinchtab_snapshot()
# Шукати елементи: [role="alert"], .text-destructive, або текст "невірний"/"помилка"

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо URL = /login AND JWT = null AND є alert
```

---

## Крок 3: Тести DIAG (після успішного Auth)

> Передумова: є активний `clientJwt` від TEST-AUTH-03. Якщо тест Auth-03 провалився — логінитися вручну тут.

### TEST-DIAG-01: Рендеринг /diagrams

```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/diagrams")
pinchtab_wait_for_load()
pinchtab_snapshot()
pinchtab_screenshot()

# Перевірити наявність ключових елементів (з фактичними селекторами після recon):
pinchtab_find("[DIAGRAMS_LEFT_PANEL_SELECTOR]")
# Очікується: знайдено

pinchtab_find("[DRAKON_EDITOR_CONTAINER_SELECTOR]")
# Очікується: знайдено

pinchtab_find("a[href='/agents'], a[href='/settings']")
# Очікується: навігаційні посилання знайдені

# РЕЗУЛЬТАТ: PASS якщо всі 3 елементи знайдені
```

### TEST-DIAG-02: Створення нової схеми
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/diagrams")
pinchtab_wait_for_load()

# Клікнути "Нова схема" (з фактичним текстом після recon)
pinchtab_click("button:has-text('[NEW_DIAGRAM_BUTTON_TEXT]')")

# Чекати появи modal/dialog
pinchtab_wait_for_selector("dialog, [role='dialog'], .modal")

# Заповнити назву
pinchtab_fill("dialog input[type='text'], [role='dialog'] input", "Test Diagram 1")

# Клікнути Створити
pinchtab_click("dialog button[type='submit'], [role='dialog'] button:has-text('Створити')")

# Чекати закриття dialog
pinchtab_wait(1000)

# Перевірити появу в лівій панелі
pinchtab_find(":text('Test Diagram 1')")
# Очікується: знайдено

# Перевірити localStorage
pinchtab_eval("JSON.parse(localStorage.getItem('diagram-storage') || '[]').length")
# Очікується: >= 1

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо елемент в списку + localStorage має записи
```

### TEST-DIAG-03: Локалізація (UA рядки)
```
# Залишаємося на /diagrams з відкритою схемою
pinchtab_snapshot()

# Перевірити наявність UA-рядків в toolbar/sidebar
# Варіанти перевірки:
pinchtab_find("button:has-text('Зберегти')")
pinchtab_find("button:has-text('Експорт')")

# Перевірити відсутність суто англомовних placeholder'ів
pinchtab_eval("document.body.innerHTML.includes('Save diagram') || document.body.innerHTML.includes('Export JSON')")
# Очікується: false (або що відповідні кнопки мають UA текст)

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо UA кнопки знайдені
```

---

## Крок 4: Тест SETTINGS

### TEST-SETT-01: Збереження Worker URL
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/settings")
pinchtab_wait_for_load()
pinchtab_snapshot()

# Знайти та заповнити Worker URL (з фактичним селектором після recon)
pinchtab_fill("[WORKER_URL_INPUT_SELECTOR]", "https://drakon-mcp-worker.maxfraieho.workers.dev")

# Зберегти
pinchtab_click("[SAVE_BUTTON_SELECTOR]")
pinchtab_wait(1000)

# Перезавантажити
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/settings")
pinchtab_wait_for_load()

# Перевірити що значення збереглося
pinchtab_eval("document.querySelector('[WORKER_URL_INPUT_SELECTOR]')?.value")
# Очікується: "https://drakon-mcp-worker.maxfraieho.workers.dev"

# Перевірити localStorage
pinchtab_eval("localStorage.getItem('settings.workerUrl') || localStorage.getItem('workerUrl')")
# Очікується: непустий рядок з URL worker'а

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо значення поля і localStorage відповідають збереженому URL
```

---

## Крок 5: Тест Pipeline A

### TEST-PIPE-A-01: Аналіз Python коду
```
# Перейти на /code (або відкрити CodeAnalysisPanel на /diagrams — з'ясувати при recon)
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/code")
pinchtab_wait_for_load()
pinchtab_snapshot()

# Знайти область вводу коду
# Monaco Editor — це div, не textarea. Вводити через keyboard:
pinchtab_click(".monaco-editor, [data-code-input], textarea.code-input")
pinchtab_keyboard_type("def calculate_sum(a, b):\n    if a > 0:\n        return a + b\n    else:\n        return b\n")

# Якщо Monaco — альтернатива через eval:
# pinchtab_eval("monaco.editor.getEditors()[0].setValue('def calculate_sum(a, b):\\n    if a > 0:\\n        return a + b\\n    else:\\n        return b')")

# Натиснути Аналізувати
pinchtab_click("[ANALYZE_BUTTON_SELECTOR]")

# Чекати появи індикатора прогресу (лоадер або текст "Аналіз")
pinchtab_wait_for_text("Аналіз", timeout=2000)
# Якщо такого тексту немає — просто wait(500)

# Чекати завершення (макс 30 секунд — LLM-агент може бути повільним)
pinchtab_wait_for_text("calculate_sum", timeout=30000)
# Або шукати IR JSON в панелі: pinchtab_find(".drakon-ir-panel, #ir-json-panel")

pinchtab_screenshot()

# Перевірити що IR з'явився
pinchtab_find(":text('calculate_sum')")
# Очікується: знайдено в DrakonIrPanel або назві схеми

# РЕЗУЛЬТАТ: PASS якщо "calculate_sum" є в DOM після аналізу
# SKIP якщо Worker недоступний (перевіряти код відповіді мережі)
```

---

## Крок 6: Тест DOCS

### TEST-DOCS-01: DQL запит через /docs
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/docs")
pinchtab_wait_for_load()
pinchtab_snapshot()

# Знайти поле DQL запиту (з recon)
# Варіанти: textarea, input, або contenteditable div
pinchtab_fill("[DQL_INPUT_SELECTOR]", "LIST FROM \"docs\" LIMIT 3")

# Виконати запит
pinchtab_click("[DQL_SUBMIT_SELECTOR]")
pinchtab_wait(2000)

# Перевірити що результати з'явились
pinchtab_snapshot()
# Шукати елементи списку результатів

pinchtab_find(":text('INDEX'), :text('ui-pages-reference'), :text('concept')")
# Очікується: хоч один із відомих документів знайдено

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо результати непусті
# NOTE: якщо /docs не містить DQL UI — зафіксувати як known gap
```

---

## Крок 7: Тест VAL-01 (відкладений — складний)

> TEST-VAL-01 (HTSE dangling pointer) потребує мутації IR-стану.
> Виконувати лише після успіху DIAG тестів.

```
# Передумова: відкрита схема в редакторі
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/diagrams")
pinchtab_wait_for_load()

# Відкрити DrakonIrPanel (кнопка "IR" або "JSON")
pinchtab_click("[IR_PANEL_TOGGLE_SELECTOR]")
pinchtab_wait(500)

# Прочитати поточний IR JSON
pinchtab_eval("document.querySelector('[IR_TEXTAREA_SELECTOR]')?.value")
# Зберегти як ORIGINAL_IR

# Мутувати IR — видалити ребро між першим action-вузлом і кінцевим
# Конкретна мутація залежить від структури схеми — виконати через eval:
pinchtab_eval("""
  const textarea = document.querySelector('[IR_TEXTAREA_SELECTOR]');
  if (textarea) {
    const ir = JSON.parse(textarea.value);
    // Видалити перший edge що веде до кінцевого вузла (end/exit)
    if (ir.edges && ir.edges.length > 0) {
      ir.edges.pop(); // Видалити останнє ребро
      textarea.value = JSON.stringify(ir, null, 2);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
""")
pinchtab_wait(1000)

# Перевірити появу validation chip або помилки
pinchtab_snapshot()
# Шукати: [data-node-error], .validation-chip, .error-chip, [role='alert']

pinchtab_screenshot()
# РЕЗУЛЬТАТ: PASS якщо є validation indicator
# SKIP якщо IR textarea не знайдена (DrakonIrPanel не відкрита)
```

---

## Крок 8: Звіт

Після всіх тестів — зібрати результати та записати звіт.

### 8.1 Зберегти всі screenshots в репо
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "ls /tmp/pinchtab-tests/"
# Перелічити всі зроблені скріншоти
```

### 8.2 Записати результати
Зберегти файл:
```bash
cat > /tmp/pinchtab-test-results-2026-05-26.md << 'EOF'
# PinchTab Test Results — 2026-05-26

## Summary
| Test | Status | Notes |
|------|--------|-------|
| TEST-AUTH-01 | PASS/FAIL/SKIP | ... |
| TEST-AUTH-02 | PASS/FAIL/SKIP | ... |
| TEST-AUTH-03 | PASS/FAIL/SKIP | ... |
| TEST-AUTH-04 | PASS/FAIL/SKIP | ... |
| TEST-DIAG-01 | PASS/FAIL/SKIP | ... |
| TEST-DIAG-02 | PASS/FAIL/SKIP | ... |
| TEST-DIAG-03 | PASS/FAIL/SKIP | ... |
| TEST-SETT-01 | PASS/FAIL/SKIP | ... |
| TEST-PIPE-A-01 | PASS/FAIL/SKIP | ... |
| TEST-DOCS-01 | PASS/FAIL/SKIP | ... |
| TEST-VAL-01 | PASS/FAIL/SKIP | ... |

## Реальні селектори (виявлені під час recon)
- Login password input: [ACTUAL]
- Login submit button: [ACTUAL]
- Diagrams left panel: [ACTUAL]
- DRAKON editor container: [ACTUAL]
- Settings Worker URL input: [ACTUAL]
- Settings save button: [ACTUAL]
- Code analyze button: [ACTUAL]
- Docs DQL input: [ACTUAL]

## Знайдені баги / відхилення від плану
[список]

## Скріншоти
[список файлів в /tmp/pinchtab-tests/]
EOF
```

### 8.3 Комітити результати в репо
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  cp /tmp/pinchtab-test-results-2026-05-26.md /home/vokov/workspace/ai-drakon-scaffolder/docs/plans/ &&
  cd /home/vokov/workspace/ai-drakon-scaffolder &&
  git add docs/plans/pinchtab-test-results-2026-05-26.md &&
  git commit -m 'test: PinchTab execution results 2026-05-26' &&
  git push
"
```

---

## Порядок виконання (оптимальний)

```
[Pre-flight] → [Recon (5 snapshots)] → [AUTH-01] → [AUTH-02] → [AUTH-03]
→ [AUTH-04] → [DIAG-01] → [DIAG-02] → [DIAG-03] → [SETT-01]
→ [PIPE-A-01] → [DOCS-01] → [VAL-01 (якщо є час)]
→ [Звіт + commit]
```

Орієнтовний час: 20–40 хвилин (Pipeline A може чекати до 30 сек на LLM).

---

## Важливі нотатки

1. **Recon є обов'язковим.** Не запускати жоден тест до завершення розвідки та заміни гіпотетичних селекторів на реальні.
2. **Monaco Editor** не є `textarea`. Вводити текст через `pinchtab_keyboard_type` або через `pinchtab_eval` з `monaco.editor.getEditors()[0].setValue(...)`.
3. **JWT persist**: після AUTH-03 не очищати localStorage до завершення всіх DIAG/SETT/PIPE тестів.
4. **PIPE-A-01 timeout**: LLM-агент може відповідати до 30 сек. Встановити `timeout=30000` для `wait_for_text`.
5. **Якщо тест FAIL**: зробити screenshot, записати фактичний vs очікуваний результат, продовжити з наступним тестом.
6. **Worker URL**: якщо `https://drakon-mcp-worker.maxfraieho.workers.dev` не відповідає — перевірити в `/settings` поточне значення або запитати Q.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/04-pinchtab-tests/_INDEX]]
**Цей документ пов'язаний з:**
- [[04-pinchtab-tests/SKILL]] — навичка запусків тестів PinchTab
- [[agents/agy/04-pinchtab-tests/PHASE2-EXTENDED]] — розширені сценарії тестування