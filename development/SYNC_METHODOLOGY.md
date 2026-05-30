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

## MemPalace-First Lookup

### 1. Головне правило: Спочатку Пошук (Search before Read)
Перед тим як читати будь-який файл проекту повністю (за допомогою `cat`, `head`, `view_file` тощо), агент обов'язково повинен виконати пошук у MemPalace:
```bash
python3 -m mempalace search "<опис або фрагмент коду>" --wing <project-slug>
```
* **Економія:** Це дозволяє зчитувати лише точкові фрагменти (за допомогою offset+limit) замість повного файлу, що забезпечує 5-10x економії контекстних токенів.
* **Вінги:** Всі запити мають чітко адресуватись до відповідного wing проекту.

### 2. Зареєстровані проекти (Registered Projects)

| Wing Name | Local Path | Agents |
|-----------|------------|--------|
| `ai-drakon` | `/home/vokov/workspace/ai-drakon-scaffolder` (Termux: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder`) | AGY3, agt-ogy |
| `uav-watcher` | `/home/vokov/projects/uav-watcher` | AGY3, agt-ogy |

### 3. Процедура комітів та синхронізації (Commit Flow)
Після кожного git push або зміни файлів, агент повинен виконати команду реєстрації змін в ai-memory для запуску переіндексації:
```bash
~/bin/ai-memory-commit.sh <project-slug> "<changed-file-1>,<changed-file-2>"
```
Це сповіщає інші агенти про необхідність оновити свої локальні бази MemPalace та гарантує синхронізацію знань між усіма учасниками розподіленої системи.

### 4. Архітектура розподіленої пам'яті (Distributed Architecture)
Кожен агент має власну локальну інсталяцію MemPalace. Бази даних та пошукові індекси розподілені між агентами (AGY, Claude Code) та координуються через спільний репозиторій та події `ai-memory`. Це виключає централізовану точку відмови та дозволяє кожному пристрою працювати автономно в режимі офлайн.

### 5. Винятки та самовідновлення (Exception & Self-Heal)
Якщо потрібний файл або його секція не знайдена через пошук MemPalace:
1. Дозволяється зробити повне зчитування файлу (як виняток).
2. Після повного читання необхідно обов'язково зареєструвати файл для індексації:
   ```bash
   ~/bin/ai-memory-commit.sh <project-slug> "<file-path>"
   ```
   Це дозволяє базі даних "самовідновитися" (self-heal) та автоматично оновити індекс для майбутніх запитів.

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
