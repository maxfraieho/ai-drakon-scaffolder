---
tags:
  - domain:kb
  - status:active
  - format:guide
created: 2026-05-29
updated: 2026-05-29
tier: 2
title: "Методологія синхронізації сесій: Claude ↔ AGY hooks"
lang: uk
---

# Методологія синхронізації сесій: Claude ↔ AGY hooks

Цей документ описує операційний протокол синхронізації між агентами-виконавцями на основі lifecycle hooks, MemPalace diary та черги задач TASKS.md.

## Архітектура синхронізації

```
Claude (OrangePi 192.168.3.161)
  SessionStart → session-start.sh:
    - git pull ai-drakon
    - якщо нові коміти → mempalace mine (background)
    - показ agt-ogy diary (last 3)
    - показ claude-code diary (last 3)
    - POST ai-memory /hook?event=SessionStart

  Stop → mempalace-save.sh:
    - POST ai-memory /hook?event=Stop
    - mine session context → MemPalace wing:vokov

AGY (Termux 192.168.3.25)
  Старт сесії → ~/bin/ai-memory-start.sh
  Кінець сесії → ~/bin/ai-memory-end.sh "session-id" "summary"
  Після кожного git commit → post-commit hook: mempalace mine (Termux local)
  Diary: python3 -m mempalace diary write --agent agt-ogy "SESSION:...|★★★"
```

## Компоненти hooks

### session-start.sh (OrangePi, Claude Code)

Файл: `~/.claude/hooks/session-start.sh`

Виконується автоматично при SessionStart:

1. **ai-memory реєстрація** — POST до `http://192.168.3.184:49374/hook?event=SessionStart` (non-blocking)
2. **git pull** — витягує нові коміти для sharon та ai-drakon
3. **MemPalace mine** — якщо є нові коміти AGY, запускає `mempalace mine` в background
4. **agt-ogy diary** — показує 3 останні записи AGY (що виконав між сесіями)
5. **claude-code diary** — показує 3 останні записи Claude

### mempalace-save.sh (OrangePi, Claude Code Stop hook)

Файл: `~/.claude/hooks/mempalace-save.sh`

Виконується при завершенні сесії:
- POST до ai-memory `hook?event=Stop`
- Mines session conversation → MemPalace wing:vokov

### ai-memory-end.sh (AGY Termux)

Файл: `~/bin/ai-memory-end.sh` на AGY phone/tablet

```bash
~/bin/ai-memory-end.sh "session-id" "що виконано: TASK-N done, commit abc123"
```

Відправляє Stop event з описовим `summary` полем.

## Сервер ai-memory

- **Docker**: `akitaonrails/ai-memory:latest` на 192.168.3.184
- **Bind**: `0.0.0.0:49374` (доступний з усієї мережі)
- **Endpoint**: `POST /hook?event=SessionStart|Stop`
- **Wiki**: `http://192.168.3.184:49374/web`

ai-memory зберігає timestamp-логи всіх hook подій у wiki pages (UUID-структура).
Основний контент синхронізації — MemPalace diary (багатший формат).

## Черга задач TASKS.md

Файл: `development/TASKS.md` в репо ai-drakon-scaffolder.

**Протокол:**
1. Claude пише задачу з точними кроками, шляхами файлів, командами верифікації
2. `git commit && git push`
3. Q активує AGY: "виконай TASK-N"
4. AGY: `~/bin/agy-task.sh "TASK-N"` (через `~/bin/delegate-agy.sh "TASK-N"` з OrangePi)
5. AGY виконує → `[x]` в TASKS.md → diary → push
6. Claude бачить результат автоматично при наступному SessionStart

## Делегування через OrangePi

```bash
# Делегувати задачу AGY phone:
bash ~/bin/delegate-agy.sh "TASK-N"

# ВАЖЛИВО: run_in_background: true, БЕЗ & в команді
# agy-task.sh логує в ~/agy-task.log на AGY
```

## Паралельне виконання (AGY3 планшет)

AGY3 (192.168.3.162, u0_a410, TermuxSsh2026!) — окремий інстанс з 100% quota.
SSH: `sshpass -p 'TermuxSsh2026!' ssh -o StrictHostKeyChecking=no -p 8022 u0_a410@192.168.3.162`

Потребує: встановити `agy-task.sh` та клонувати репо (TASK-29).

## Семантичні зв'язки
**Цей документ є частиною:** [[kb/_INDEX]]
**Пов'язано з:** [[COLLABORATION]] — повний гайд по Claude+AGY системі
