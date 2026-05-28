---
tags:
  - domain:report
  - status:active
  - format:report
created: 2026-05-26
updated: 2026-05-28
tier: 3
title: "Каталог багів та невідповідностей UI"
lang: uk
---

# Каталог багів та невідповідностей UI — AI-DRAKON

### BUG-6: Рендеринг Agent Studio
- **Тест-кейс**: TEST-AGENT-01
- **URL**: `https://ai-drakon-scaffolder.pages.dev/agents`
- **Очікувано**: Відображається інтерфейс чату та список активних агентів.
- **Фактично**: Текстове поле чату не знайдено або не завантажено.
- **Знімок екрану**: `agents-page.png`
- **Важливість**: ВИСОКА (HIGH)
- **Категорія**: Агент (Agent)

---

### BUG-7: Клік по кнопці 'New Pipeline'
- **Тест-кейс**: TEST-PIPELINE-02
- **URL**: `https://ai-drakon-scaffolder.pages.dev/pipelines`
- **Очікувано**: Кнопка "New Pipeline" існує та відкриває майстер налаштування (wizard).
- **Фактично**: Кнопку "New Pipeline" не знайдено в інтерфейсі користувача.
- **Знімок екрану**: `pipelines-page.png`
- **Важливість**: СЕРЕДНЯ (MEDIUM)
- **Категорія**: Пайплайн (Pipeline)

---

## Семантичні зв'язки

**Цей документ є частиною:** [[reports/_INDEX]]
**Цей документ пов'язаний з:**
- [[plans/2026-05-26-pinchtab-test-plan]] — План тестування PinchTab — Платформа AI-DRAKON
- [[plans/2026-05-22-platform-redesign]] — план реалізації редизайну