# Astryx Design Context & Token Guidelines

> **Нормативне джерело:** [ADR-0009: Використовувати Astryx як канонічну дизайн-систему AI-DRAKON](../../docs/adr/0009-astryx-canonical-design-system.md)  
> **Специфікація:** `specs/002-methodology-and-astryx-refactor` (Task T-239)  
> **Призначення:** Контекст і правила використання дизайн-системи Astryx для розробників та AI-агентів.

---

## 1. Концепція Astryx у AI-DRAKON

Astryx — це канонічна дизайн-система та UI-фреймворк для AI-DRAKON (*"One system for humans and AI"*). Вона забезпечує єдиний набір токенів, компонентів, тем і патернів взаємодії.

### Ключовий принцип: UI-шар поверх бурштинового (amber) бренду
Astryx **не замінює** усталену бурштинову ідентичність AI-DRAKON іншою палітрою, а оформлює її через структуровану систему токенів і тем.

> **Головне правило токенізації:**  
> **Amber-бренд застосовується ТІЛЬКИ через канонічні токени Astryx, ніколи через сирий hex.**  
> Заборонено використовувати довільні значення типу `#[0-9a-fA-F]{3,6}` (наприклад, `#f59e0b`, `#fbbf24`, `bg-[#111827]`) безпосередньо в `className` або `style` React-компонентів.

---

## 2. Канонічні токени Astryx

Усі токени визначені в [`src/styles/astryx.css`](../../src/styles/astryx.css) для тем `light` (`[data-astryx-theme="astryx"]`, `[data-astryx-theme="light"]`) та `dark` (`[data-astryx-theme="dark"]`, `.dark`).

### 2.1. Бренд-токени (Amber Brand)

| CSS-змінна | Light / Astryx | Dark | Призначення |
|---|---|---|---|
| `--astryx-color-brand` | `#f59e0b` | `#fbbf24` | Основний акцентний колір бренду (amber) |
| `--astryx-color-brand-hover` | `#d97706` | `#f59e0b` | Стан наведення (hover) |
| `--astryx-color-brand-light` | `rgba(245, 158, 11, 0.16)` | `rgba(251, 191, 36, 0.18)` | Напівпрозорий фон для активних елементів/бейджів |
| `--astryx-color-on-brand` | `#17120a` | `#17120a` | Контрастний колір тексту/іконок поверх `--astryx-color-brand` |

### 2.2. Поверхні (`--astryx-surface-*`)

| CSS-змінна | Light / Astryx | Dark | Призначення |
|---|---|---|---|
| `--astryx-surface-page` | `#f0f2f5` | `#18191a` | Фоновий колір сторінки |
| `--astryx-surface-primary` | `#ffffff` | `#242526` | Основний колір контейнерів, карток, хедерів |
| `--astryx-surface-secondary` | `#f7f8fa` | `#1c1e21` | Вторинний фон (бокові панелі, інпути, ховери) |
| `--astryx-surface-elevated` | `#ffffff` | `#3a3b3c` | Піднесені поверхні (модальні вікна, дропдауни, тултіпи) |

### 2.3. Типографіка та текст (`--astryx-text-*`)

| CSS-змінна | Light / Astryx | Dark | Призначення |
|---|---|---|---|
| `--astryx-text-primary` | `#1c1e21` | `#e4e6eb` | Основний текст високої контрастності |
| `--astryx-text-secondary` | `#65676b` | `#b0b3b8` | Допоміжний текст, описи, підписи |
| `--astryx-text-muted` | `#8a8d91` | `#8a8d91` | Приглушений/плейсхолдер текст |

### 2.4. Межі та обведення (`--astryx-border-*`)

| CSS-змінна | Light / Astryx | Dark | Призначення |
|---|---|---|---|
| `--astryx-border-subtle` | `#e4e6eb` | `#393a3b` | Тонкі межі карток, розділювачів, таблиць |
| `--astryx-border-focus` | `#f59e0b` | `#fbbf24` | Обведення при фокусі (акцентне) |

### 2.5. Геометрія, тіні та шрифти

- **Радіуси:** `--astryx-radius-sm` (6px), `--astryx-radius-md` (10px), `--astryx-radius-lg` (16px)
- **Тіні:** `--astryx-shadow-card`, `--astryx-shadow-dropdown`
- **Шрифти:** `--astryx-font-sans` (`Albert Sans`, sans-serif), `--astryx-font-mono` (`JetBrains Mono`, monospace)

---

## 3. Канонічні компоненти та класи

- **Кнопки:** база `.astryx-button` + розмір-модифікатор (`.sm`, `.md`) + варіант-модифікатор (`.primary`, `.ghost`) — напр. `class="astryx-button primary md"`. Варіантів `secondary`/`danger` наразі НЕ існує в `astryx.css`.
- **Бейджі:** база `.astryx-badge` + варіант-модифікатор (`.primary`, `.success`) — напр. `class="astryx-badge primary"`. Атрибут `data-variant` не використовується — варіант передається класом-модифікатором.
- **Навігація та App Shell:** `<AstryxHeader>`, `<AstryxSideNav>`, єдиний конфіг `ASTRYX_NAV_ITEMS`
- **Bridge-клас міграції:** `.astryx-migrated` — ізольована область сторінки/компонента, де стандартні Tailwind-класи автоматично транслюються у відповідні змінні Astryx.

---

## 4. Автоматична перевірка (Enforcement Lint)

Для контролю дотримання правил використовується лінтер токенів:
```bash
bash bin/check-astryx-tokens.sh
```

Скрипт перевіряє `src/pages/*.tsx` та `src/components/**/*.tsx` на наявність сирих hex-значень (`#[0-9a-fA-F]{3,6}`) у `className` або `style` атрибутах і блокує порушення в коді, що не знаходиться під захистом `.astryx-migrated`.
