---
name: agy-termux
description: |
  Робота з AGY (Antigravity CLI) — всі інстанси: телефон (AGY), ноутбук (AGY2), планшет (AGY3).
  Claude = оркестратор (пише плани, TASKS.md). AGY = виконавець (реалізує, комітить, пише diary).
  
  Активуй коли:
  - "відправ задачу AGY", "делегуй AGY", "AGY виконай", "AGY онлайн?"
  - "AGY2/AGY3 доступний?", "пиши в TASKS.md", "делегуй через TASKS"
  - "запусти через проксі", "перевір AGY", "AGY вилетів", "проксі недоступний"
  - "що AGY зробив", "виправи через AGY", "перезапусти sshd"
  
  Повна інфра: [references/infra.md](references/infra.md)
---

# AGY Workflow (всі інстанси)

## Архітектура

```
Claude (OrangePi)          AGY phone/tablet/laptop
      │                           │
      ├─ TASKS.md ──git push──►  git pull → execute → commit → diary
      ├─ SSH ───────────────────► bash/python скрипти напряму
      └─ proxy /v1/messages ────► Gemini/Claude (текст тільки, без файлів)
```

**Ключове правило:** Proxy = LLM текст. SSH = реальні зміни файлів.

---

## 1. Перевірити доступність + поточний IP AGY

```bash
# AGY phone — IP динамічний (DHCP). Спочатку перевір через tunnel:
curl -s --max-time 3 https://agy.exodus.pp.ua/health | python3 -m json.tool | head -5

# Знайти поточний локальний IP:
# Варіант 1 — через arp (якщо AGY був онлайн недавно):
arp -n | grep -E "192\.168\.3\." | head -10

# Варіант 2 — ping scan підмережі:
for i in $(seq 1 30); do ping -c1 -W1 192.168.3.$i > /dev/null 2>&1 && echo "192.168.3.$i UP"; done

# Перевірити конкретний IP:
ping -c 1 -W 2 192.168.3.25 && echo "AGY OK" || echo "DOWN"
sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.25 'echo OK' 2>/dev/null

# AGY3 планшет (статичний IP):
ping -c 1 -W 2 192.168.3.162 && echo "AGY3 OK" || echo "AGY3 DOWN"

# AGY2 ноутбук:
curl -s --max-time 3 https://agy2.exodus.pp.ua/health
```

**Якщо IP змінився:** оновити у `~/bin/delegate-agy.sh` рядок `AGY_IP="..."`.

**Якщо DOWN:** Android заблокував екран → SSH мертвий. Розбудити фізично.

---

## 2. Делегування задачі AGY CLI (ПРАВИЛЬНИЙ спосіб)

### Готовий скрипт (рекомендовано — завжди через нього)

```bash
# Делегувати конкретну задачу з TASKS.md:
bash ~/bin/delegate-agy.sh "TASK-24"

# Авто — перша [ ] задача:
bash ~/bin/delegate-agy.sh
```

**ВАЖЛИВО:** використовуй `run_in_background: true` в Bash tool — AGY може працювати 2-10 хвилин.
Отримаєш нотифікацію коли закінчить. **НЕ додавай `&`** — він вбиє agy при закритті SSH.

### Перевірити результат після нотифікації

```bash
# Повний лог виконання (на AGY phone):
sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.25 \
  'tail -50 ~/agy-task.log'

# Нові коміти?
git fetch origin && git log --oneline origin/main -5

# Diary AGY:
# mcp__mempalace__mempalace_diary_read(agent_name="agt-ogy", last_n=3)
```

---

## 3. TASKS.md — делегування через git

Найнадійніший спосіб для складних задач:

```bash
# 1. Додай задачу в development/TASKS.md
# 2. Push
cd ~/workspace/ai-drakon-scaffolder
git add development/TASKS.md
git commit -m "chore(tasks): add TASK-N"
git push origin main

# 3. Делегуй:
bash ~/bin/delegate-agy.sh "TASK-N"
```

Хороша задача для TASKS.md містить:
1. **Файли** — точні шляхи
2. **Що змінити** — конкретно, не "виправ"
3. **Верифікацію** — команда перевірки
4. **Коміт** — шаблон повідомлення
5. **Diary** — що записати: `"SESSION:YYYY-MM-DD|TASK-N:done|commit:<hash>|★★★"`
6. **Де запускати** — явно вказати: "run locally on Termux, NO SSH" або "SSH to 192.168.3.184"

⚠️ **AGY плутається де запускати якщо не вказано явно.** Без `!!IMPORTANT!! Run locally` він може піти на dev server шукати mempalace (якого там немає). Завжди додавай контекст виконання.

---

## 4. SSH — запуск скриптів напряму (короткі задачі)

```bash
# AGY телефон — коротка команда (< 30 сек):
sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.25 'КОМАНДА'

# AGY3 планшет:
sshpass -p 'TermuxSsh2026!' ssh -o StrictHostKeyChecking=no -p 8022 u0_a410@192.168.3.162 'КОМАНДА'
```

Multi-line скрипт через Python (безпечніше ніж heredoc в SSH):
```bash
sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.25 \
'python3 - << '"'"'PYEOF'"'"'
import os
# ... скрипт ...
PYEOF'
```

⚠️ **Не використовуй heredoc з `|` у тілі** — zsh парсить і ламає команду.

---

## 5. Proxy API — тільки короткі текстові відповіді

```bash
sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.25 \
'python3 - << '"'"'PYEOF'"'"'
import json, urllib.request
payload = json.dumps({
    "model": "gemini-2.5-flash",
    "max_tokens": 2000,
    "messages": [{"role": "user", "content": "КОРОТКИЙ ЗАПИТ"}]
}).encode()
req = urllib.request.Request("http://localhost:8080/v1/messages",
    data=payload, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=30) as r:
    resp = json.loads(r.read())
for b in resp.get("content", []):
    if b.get("type") == "text":
        print(b["text"])
PYEOF'
```

Тільки `gemini-2.5-flash` + прості запити. Для коду/файлів → AGY CLI.

---

## 6. Верифікація результатів

```bash
# 1. Нові коміти від AGY?
git fetch origin && git log --oneline origin/main -5

# 2. Лог останнього виконання:
sshpass -p '123456' ssh -o StrictHostKeyChecking=no -p 8022 u0_a284@192.168.3.25 \
  'tail -30 ~/agy-task.log'

# 3. Diary (через MCP):
# mcp__mempalace__mempalace_diary_read(agent_name="agt-ogy", last_n=3)

# 4. TASKS.md статуси:
sshpass -p '805235io.' ssh vokov@192.168.3.184 \
  'grep -E "^\[.\] TASK" ~/workspace/ai-drakon-scaffolder/development/TASKS.md | tail -10'
```

---

## Вибір агента для задачі

| Тип задачі | Агент | Команда |
|------------|-------|---------|
| Складні (TypeScript, SSH, багато кроків) | **AGY3** tablet (192.168.3.162) | `sshpass -p 'TermuxSsh2026!' ssh -p 8022 u0_a410@192.168.3.162 '~/bin/agy-task.sh "TASK-N"'` |
| Windows-специфічні або PowerShell | **AGY2** laptop (192.168.3.30) | `bash ~/bin/delegate-agy2.sh "TASK-N"` |
| Прості (Python, docs, diary) | AGY phone або AGY3 | `bash ~/bin/delegate-agy.sh "TASK-N"` |
| Паралельне | AGY3 + AGY2 одночасно | обидва run_in_background |

**AGY2 Windows laptop:**
- SSH: `sshpass -p '0523' ssh vokov@192.168.3.30`
- Script: `C:\Users\vokov\bin\agy-task.ps1`
- Delegate: `bash ~/bin/delegate-agy2.sh "TASK-N"`
- Public: https://agy2.exodus.pp.ua
- mempalace: Python 3.12, mempalace 3.3.5 встановлено локально

**AGY phone (192.168.3.25) стабільно timeout на:**
- Складних TypeScript задачах
- Довгих SSH операціях
- Задачах з багатьма кроками

**→ Усі складні задачі делегуй на AGY3.**

## Типові проблеми

| Симптом | Причина | Рішення |
|---------|---------|---------|
| SSH timeout / no output | `&` в команді вбиває agy | Видали `&`, використовуй `run_in_background: true` в Bash tool |
| agy вийшов одразу | SSH сесія закрилась | Використовуй `delegate-agy.sh` (він не додає `&`) |
| SSH timeout | Екран заблоковано | Розбудити пристрій фізично |
| IP змінився | DHCP | `arp -n` або `ping 192.168.3.1-30`, оновити в `delegate-agy.sh` |
| proxy 502 | cloudflared впав | `sudo rc-service cloudflared restart` на OrangePi |
| heredoc `\|` ламає | zsh парсить `\|` | Використовуй Python для multi-line замість heredoc |
| `python3 -m mempalace diary` немає | API змінився | `mcp__mempalace__mempalace_diary_write` |
| AGY phone timeout на складній задачі | Quota або складність | Перенеси задачу на AGY3 |
