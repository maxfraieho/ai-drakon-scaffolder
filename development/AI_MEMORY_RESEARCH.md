---
tags:
  - domain:kb
  - status:active
  - format:reference
created: 2026-05-28
updated: 2026-05-28
tier: 2
title: "AI-Memory vs MemPalace: дослідження"
lang: uk
---
# AI-Memory vs MemPalace
## Висновок
РАЗОМ: ai-memory = автокапча сесій (hooks), MemPalace = семантична пам'ять + KG
## ai-memory (akitaonrails/ai-memory)
- Rust бінарник, SQLite FTS5, git-versioned wiki
- Автоматичне захоплення сесій через lifecycle hooks
- Endpoint: http://192.168.3.184:49374
## MemPalace
- Python, ChromaDB, wings/rooms/drawers/diary/KG
- Семантичний пошук, авто-mine коду
- - Оперативна пам'ять між сесіями
## Схема використання
- ai-memory → SessionStart/Stop hooks → cross-agent handoff
- MemPalace → code context, diary, KG, semantic search
---
## Семантичні зв'язки
Цей документ є частиною: [[development/_INDEX]]
Пов'язано з: [[HANDOFF]] — контекст для наступної сесії
