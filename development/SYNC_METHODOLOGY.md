---
tags:
  - domain:meta
  - status:canonical
  - format:guide
created: 2026-05-29
updated: 2026-05-29
tier: 1
title: "Методологія синхронізації Claude ↔ AGY"
lang: uk
---

# Методологія синхронізації Claude ↔ AGY

## Архітектура пам'яті (3 рівні)

| Рівень | Інструмент | Призначення |
|--------|-----------|-------------|
| L1 | **MemPalace diary** | Багатий diary між сесіями — ОСНОВНИЙ |
| L2 | **TASKS.md** | Черга завдань + статуси [x] |
| L3 | **ai-memory hooks** | Timestamp + summary реєстрація |
| L3+ | **git log** | Факт виконання (commits) |

## Протокол для Claude Code (OrangePi)

### При старті (SessionStart hook: session-start.sh)
Автоматично при кожній сесії:
- `git pull` для sharon та ai-drakon
- Показує **agt-ogy diary** (last 3) — що AGY зробив між сесіями ← ключовий синк
- Показує **claude-code diary** (last 3) — що Claude робив раніше
- Перевіряє ai-memory online статус

### При завершенні (Stop hook: mempalace-save.sh)
- POST до `http://192.168.3.184:49374/hook?event=Stop` (автоматично)
- Claude пише diary через `session-end` skill або `! ~/bin/session-end.sh both "..."`

## Протокол для AGY (Termux)

### При завершенні — обов'язкова послідовність
```bash
# 1. ai-memory stop event з summary
~/bin/ai-memory-end.sh "session-id" "що зробив: TASK-N done, commit abc123"

# 2. MemPalace diary — ОБОВ'ЯЗКОВО з деталями (це читає Claude!)
python3 -m mempalace diary write --agent agt-ogy \
  "SESSION:YYYY-MM-DD|TASK-N:task-name|DONE|commit:<hash>|actions|★★★"

# 3. TASKS.md [x] + push (git log читає Claude при старті)
git add development/TASKS.md
git commit -m "chore(tasks): TASK-N done"
git push origin main
```

## MemPalace post-commit hook

На dev server (192.168.3.184) в `.git/hooks/post-commit`:
```bash
#!/bin/sh
nohup python3 -m mempalace mine ~/workspace/ai-drakon-scaffolder \
  --wing ai_drakon_scaffolder > /dev/null 2>&1 &
```
Результат: кожен git commit → MemPalace auto-mine → Claude бачить актуальний код через той самий сервер.

## Формат diary записів

### AGY (agt-ogy)
```
SESSION:YYYY-MM-DD|TASK-N:task-name|DONE|commit:<hash>|
key-action-1|key-action-2|★★★
```

### Claude (claude-code)
```
SESSION:YYYY-MM-DD|session-topic|
DONE:[список]|NEXT:[наступні кроки]|★★★
```

## Повний цикл задачі

```
[Claude, старт] session-start.sh → agt-ogy diary last 3 → розуміє що AGY зробив
[Claude] пише TASKS.md з детальними кроками → git push
[Q] каже AGY: "виконай TASK-N"
[AGY, старт] git pull → читає TASKS.md
[AGY] виконує кроки → git commit (post-commit: MemPalace mine)
[AGY] TASKS.md [x] → git push
[AGY, кінець] diary write + ai-memory-end.sh з summary
[Claude, наст. сесія] session-start.sh показує agt-ogy diary → синк автоматичний ✅
```

## Семантичні зв'язки
**Цей документ є частиною:** [[development/_INDEX]]
**Пов'язано з:** [[COLLABORATION]] — повний гайд по Claude+AGY
