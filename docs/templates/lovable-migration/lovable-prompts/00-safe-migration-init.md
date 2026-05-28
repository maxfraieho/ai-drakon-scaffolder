---
tags:
  - domain:kb
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Промпт ініціалізації безпечної міграції Lovable"
lang: uk
---

# Промпт ініціалізації безпечної міграції Lovable (Safe Migration Init)

Це існуюча робоча кодова база — **не генеруйте код з нуля, не створюйте каркаси (scaffold) і не змінюйте файли без вимог.**

Прочитайте існуючий репозиторій та підтвердьте, що ви його бачите.

Критичні інваріанти (НІКОЛИ не порушувати):
- `src/lib/htse/` — ядро проміжного представлення (IR) DRAKON, ніколи не змінювати.
- `public/drakonwidget.js` — рендерер полотна (canvas), ніколи не чіпати.
- `.github/workflows/mirror-to-ai-drakon.yml` — CI для дзеркалювання, ніколи не видаляти.
- **Кожна зміна файлів має застосовуватися як до `src/`, так і до `.lovable/src/`** (існують дві ідентичні копії).

Стек технологій: React 18 + Vite + TanStack Router (файловий роутинг, `src/routes/`) + shadcn/ui + Tailwind.
Бекенд-агенти: `drakon-agent` :8765, `architect-agent` :8766, `docs-agent` :8767 — доступ здійснюється через Cloudflare Worker.

Підтвердьте готовність: виведіть список із 5 файлів, які ви бачите в репозиторії (у папках `routes/`, `components/`, `lib/`).
Готовий до отримання промптів для реалізації фіч.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[templates/_INDEX]]
**Цей документ пов'язаний з:**
- [[templates/lovable-migration/README]] — Інструкція з міграції Lovable
- [[templates/lovable-migration/lovable-prompts/00-project-init]] — Промпт ініціалізації проекту Lovable
**Читати далі:** [[templates/lovable-migration/lovable-prompts/00-handoff]]
