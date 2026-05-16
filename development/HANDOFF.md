# HANDOFF — для нового Claude (Orange Pi PC2, 192.168.3.161)

**Проект:** AI-DRAKON Platform
**Дата:** 2026-05-16
**Звідки читати решту:** `~/workspace/ai-drakon-setup/development/`

---

## ЩО ЗРОБЛЕНО В ЦІЙ СЕСІЇ

1. **Prompt 33 написано і відправлено в Lovable** — повна переробка `CodeGenerationPanel.tsx` за Stitch-дизайном
2. **Lovable реалізував** — Monaco Editor, localStorage history, idle/done states, history panel 320px, Obsidian палітра
3. **CF Pages build: ✅ успішний**
4. **00-stitch-lovable-template.md** — стандарт написання промтів для Lovable+Stitch

## ПЕРШОЧЕРГОВА ЗАДАЧА: Верифікація Sprint 2

**URL:** https://ai-drakon-setup.pages.dev/diagram/editor

Детальний чеклист: `development/VERIFICATION_CHECKLIST.md`

Коротко що перевірити:
1. Відкрити CodeGenerationPanel (кнопка `</>` amber у правому куті)
2. **Idle state:** форма + history 320px справа, disabled generate без схеми
3. **Done state:** Monaco Editor (не `<pre>`), status bar з tabular-nums, copy opacity-60
4. **Дизайн:** JetBrains Mono, Obsidian dark (#131313), amber тільки на actionable
5. **localStorage:** history зберігається між відкриттями

Якщо є відхилення → написати correction prompt за шаблоном `lovable-prompts/00-stitch-lovable-template.md`.

## ІНСТРУМЕНТИ

### SSH на dev server
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
# Репо: ~/workspace/ai-drakon-setup/
# PinchTab: http://localhost:9867, token: 0117419fcfb5de5d82220c1f9da8de97
```

### Скріншоти через PinchTab (ТІЛЬКИ curl, НЕ MCP screenshot!)
```bash
# 1. Список вкладок (через MCP pinchtab_list_tabs)
# 2. Скріншот через curl:
sshpass -p '805235io.' ssh vokov@192.168.3.184 \
  'curl -s -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
   "http://localhost:9867/screenshot?raw=true&tabId=TAB_ID&format=jpeg&quality=88" \
   -o /tmp/screen.jpg'
# 3. scp /tmp/screen.jpg на локальну машину → Read для перегляду
```

Детально: `development/PINCHTAB_GUIDE.md`

### Lovable промти
Детально: `development/LOVABLE_STITCH_WORKFLOW.md`
Шаблон: `~/workspace/ai-drakon-setup/lovable-prompts/00-stitch-lovable-template.md`

## ПІСЛЯ ВЕРИФІКАЦІЇ — Sprint 3

Sprint 3: KB Integration (SQLite + RAG)
- Поки без деталей — визначити після верифікації Sprint 2

## СТРУКТУРА ПАПОК development/

```
development/
├── HANDOFF.md                   ← цей файл
├── SESSION_STATE.md             ← повний стан сесії та репо
├── VERIFICATION_CHECKLIST.md   ← що і як перевіряти
├── PINCHTAB_GUIDE.md            ← PinchTab workflow та команди
└── LOVABLE_STITCH_WORKFLOW.md   ← Lovable+Stitch правила та команди
```

## ВАЖЛИВО для продовження

1. **Після будь-яких змін** — пушити в ОБИДВА репо (`ai-drakon-setup` та `drakon-flow-90aa2999`)
2. **Завжди редагувати** `.lovable/src/` (не `src/`)
3. **PinchTab screenshots** — тільки curl, ніколи MCP screenshot
4. **`drakonwidget.js`** — НІКОЛИ не чіпати
5. **Hex кольори** — не хардкодити в промтах для Lovable (тільки токени)
