---
tags:
  - domain:agent
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 3
title: "PinchTab Access — AGY Configuration"
lang: uk
---

# PinchTab — Доступ для AGY

> PinchTab — HTTP API для автоматизації Chromium на `192.168.3.184`.
> Всі команди виконуються через SSH на `192.168.3.184`.

---

## Конфігурація

| Параметр | Значення |
|----------|---------|
| API base | `http://localhost:9867` |
| Token | `0117419fcfb5de5d82220c1f9da8de97` |
| Instance | `inst_ad981ee9` (перевіряти динамічно!) |
| Chromium | headless, 1280×800 |

**УВАГА:** Instance ID може змінитись після перезапуску. Завжди отримувати його динамічно:
```bash
TOKEN="0117419fcfb5de5d82220c1f9da8de97"
INSTANCE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9867/instances | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")
echo "Instance: $INSTANCE"
```

---

## SSH wrapper — обов'язковий для всіх команд

Всі команди виконуються через:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "..."
```

Для зручності — встановити змінну на початку сесії:
```bash
SSH="sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184"
TOKEN="0117419fcfb5de5d82220c1f9da8de97"
```

---

## Базові операції

### Отримати instance ID
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    http://localhost:9867/instances
"
```

### Список вкладок
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    http://localhost:9867/instances/inst_ad981ee9/tabs
"
```

### Відкрити нову вкладку
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -X POST \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    -H 'Content-Type: application/json' \
    http://localhost:9867/instances/inst_ad981ee9/tabs/open \
    -d '{\"url\": \"about:blank\"}'
"
# Зберегти id вкладки: {"id":"tab_XXXXX",...}
```

### Навігація (обов'язково через /tabs/:id/navigate)
```bash
# ВАЖЛИВО: endpoint /tabs/{id}/navigate, НЕ /instances/{id}/tabs/{id}/navigate!
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -X POST \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    -H 'Content-Type: application/json' \
    http://localhost:9867/tabs/TAB_ID/navigate \
    -d '{\"url\": \"https://ai-drakon-scaffolder.pages.dev/login\"}'
"
```

### Snapshot (accessibility tree — для знаходження ref)
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    http://localhost:9867/tabs/TAB_ID/snapshot
" | python3 -c "
import sys, json
data = json.load(sys.stdin)
nodes = data.get('nodes', [])
for n in nodes:
    if n.get('role') in ('textbox','button','link','heading','input'):
        print(f\"ref={n['ref']} role={n['role']} name={n.get('name','')!r}\")
"
```

### Screenshot (ОБОВ'ЯЗКОВО curl-pipe!)
```bash
# НЕ використовувати Python urllib — RemoteDisconnected помилка!
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s --max-time 30 \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    http://localhost:9867/tabs/TAB_ID/screenshot | python3 -c '
import sys, json, base64
d = json.load(sys.stdin)
open(\"/tmp/pinchtab-tests/FILENAME.png\", \"wb\").write(base64.b64decode(d[\"base64\"]))
print(\"Saved.\")
'
"
```

---

## Дії (Actions) — click, type, fill

### Click по ref (зі snapshot)
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -X POST \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    -H 'Content-Type: application/json' \
    http://localhost:9867/tabs/TAB_ID/action \
    -d '{\"kind\": \"click\", \"ref\": \"REF_FROM_SNAPSHOT\"}'
"
```

### Type (для React input — ОБОВ'ЯЗКОВО click → type!)
```bash
# React контролює input через onChange. fill (DOM value) НЕ працює!
# Правильна послідовність:

# 1. Click на поле
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -X POST \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    -H 'Content-Type: application/json' \
    http://localhost:9867/tabs/TAB_ID/action \
    -d '{\"kind\": \"click\", \"ref\": \"INPUT_REF\"}'
"

# 2. Type текст (симулює кейпреси → React onChange спрацьовує)
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -X POST \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    -H 'Content-Type: application/json' \
    http://localhost:9867/tabs/TAB_ID/action \
    -d '{\"kind\": \"type\", \"ref\": \"INPUT_REF\", \"text\": \"ТЕКСТ\"}'
"
```

### Eval — виконати JavaScript
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s -X POST \
    -H 'Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97' \
    -H 'Content-Type: application/json' \
    http://localhost:9867/tabs/TAB_ID/eval \
    -d '{\"script\": \"window.location.pathname\"}'
"
# Або очистити localStorage:
# -d '{\"script\": \"localStorage.clear(); sessionStorage.clear(); true\"}'
```

---

## Повний сценарій: логін на AI-DRAKON

```bash
TOKEN="0117419fcfb5de5d82220c1f9da8de97"
BASE="http://localhost:9867"

# 0. Отримати instance
INSTANCE=$(sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -H 'Authorization: Bearer $TOKEN' $BASE/instances" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'])")

# 1. Відкрити вкладку
TAB=$(sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -X POST -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
   $BASE/instances/$INSTANCE/tabs/open -d '{\"url\":\"about:blank\"}'" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 2. Навігація на /login
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -X POST -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
   $BASE/tabs/$TAB/navigate -d '{\"url\":\"https://ai-drakon-scaffolder.pages.dev/login\"}'"

# 3. Чекати 2 сек (JS rendering)
sleep 2

# 4. Snapshot — знайти ref поля пароля та кнопки
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -H 'Authorization: Bearer $TOKEN' $BASE/tabs/$TAB/snapshot" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for n in d.get('nodes', []):
    if n.get('role') in ('textbox', 'button', 'link'):
        print(f\"ref={n['ref']} role={n['role']} name={n.get('name','')!r}\")
"

# 5. Клікнути поле пароля (ref з snapshot, напр. e12)
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -X POST -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
   $BASE/tabs/$TAB/action -d '{\"kind\":\"click\",\"ref\":\"PASSWORD_REF\"}'"

# 6. Ввести пароль
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -X POST -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
   $BASE/tabs/$TAB/action -d '{\"kind\":\"type\",\"ref\":\"PASSWORD_REF\",\"text\":\"805235io\"}'"

# 7. Клікнути Submit
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -X POST -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
   $BASE/tabs/$TAB/action -d '{\"kind\":\"click\",\"ref\":\"SUBMIT_REF\"}'"

# 8. Чекати 2 сек + перевірити URL
sleep 2
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s -X POST -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
   $BASE/tabs/$TAB/eval -d '{\"script\":\"window.location.pathname\"}'"
# Очікується: {"result":"/diagrams"}

# 9. Screenshot
mkdir -p /tmp/pinchtab-tests
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  curl -s --max-time 30 -H 'Authorization: Bearer $TOKEN' \
    $BASE/tabs/$TAB/screenshot | python3 -c '
import sys,json,base64
d=json.load(sys.stdin)
open(\"/tmp/pinchtab-tests/login-success.png\",\"wb\").write(base64.b64decode(d[\"base64\"]))
print(\"Saved login-success.png\")
'
"

echo "TAB_ID=$TAB (зберегти для подальших тестів)"
```

---

## Поширені помилки

| Помилка | Причина | Рішення |
|---------|---------|---------|
| `fill` не спрацьовує | React контролює input | Замінити на `click` → `type` |
| `RemoteDisconnected` при screenshot | Python urllib | Використовувати curl | python3 |
| Instance not found | Перезапуск PinchTab | Оновити INSTANCE через /instances |
| Навігація не міняє URL | Неправильний endpoint | Використовувати `/tabs/{id}/navigate`, не `/instances/{id}/tabs/{id}/navigate` |
| Пустий snapshot | Рендеринг ще не завершений | `sleep 2` перед snapshot |
| React не бачить input | `fill` замість `type` | click поле → type текст |

---

## Знайомі ref на AI-DRAKON (з попередніх сесій)

> Ці ref можуть змінитись. Завжди перевіряти через свіжий snapshot!

| Елемент | Ref (попередній) | URL |
|---------|-----------------|-----|
| Кнопка "Увійти" | перевірити | /login |
| Агенти панель (header) | e7 | /diagrams |
| Кнопка "Create new diagram" | e39 | /diagrams |
| DRAKON editor URL | `/diagram/editor?folderId=general&isNew="true"` | — |

---

## Корисні shell alias для сесії

Встановити на початку робочої сесії AGY:
```bash
export PT_TOKEN="0117419fcfb5de5d82220c1f9da8de97"
export PT_BASE="http://localhost:9867"

# Отримати поточний instance
get_instance() {
  curl -s -H "Authorization: Bearer $PT_TOKEN" $PT_BASE/instances | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else 'NO_INSTANCE')"
}

# Snapshot з фільтрацією
snap() {
  curl -s -H "Authorization: Bearer $PT_TOKEN" $PT_BASE/tabs/$1/snapshot | \
    python3 -c "
import sys,json
for n in json.load(sys.stdin).get('nodes',[]):
    if n.get('role') in ('textbox','button','link','heading','tab','listitem'):
        print(f\"  {n['ref']} [{n['role']}] {n.get('name','')!r}\")
"
}

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/04-pinchtab-tests/_INDEX]]
**Цей документ пов'язаний з:**
- [[04-pinchtab-tests/SKILL]] — навичка запусків тестів PinchTab
- [[04-pinchtab-tests/PHASE2-EXECUTION]] — виконання тестів PinchTab Phase 2
- [[04-pinchtab-tests/PHASE2-EXTENDED]] — розширені тести PinchTab Phase 2
```