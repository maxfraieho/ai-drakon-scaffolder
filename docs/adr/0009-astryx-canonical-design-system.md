---
status: "accepted"
date: 2026-08-18
deciders: "оператор + Codex"
spec: "specs/002-methodology-and-astryx-refactor"
supersedes: null
superseded-by: null
---

# 0009. Використовувати Astryx як канонічну дизайн-систему AI-DRAKON

## Контекст і формулювання проблеми

У frontend існують Astryx tokens/components і legacy amber UI, але shell та сторінки використовують їх непослідовно. Astryx є UI-фреймворком — системою компонентів, токенів, тем і патернів — поверх amber AI-DRAKON brand, а не заміною бренду випадковою палітрою.

## Рушії рішення

* узгоджена робота людей і AI-агентів;
* two-speed brownfield adoption без зламу production;
* доступний контраст і єдине джерело UI-токенів.

## Розглянуті варіанти

* Astryx canonical layer поверх amber brand;
* залишити bespoke legacy UI;
* замінити amber на іншу палітру.

## Підсумок рішення

Обрано Astryx як canonical UI layer поверх amber identity. Канонічні primitives — `--astryx-*` tokens, `astryx-button`, `astryx-badge`, `data-astryx-theme`, `AstryxHeader`, `AstryxSideNav` і `ASTRYX_NAV_ITEMS`. Нові компоненти поза Astryx не додаються; legacy `--accent-amber`/`--bg-base` мігрують поступово через aliases/bridges до завершення brownfield-переходу.

### Наслідки

* Добре: UI має єдині tokens, states і navigation patterns.
* Добре: amber identity зберігається, а контраст можна перевіряти централізовано.
* Погано: Two-Speed міграція тимчасово підтримує legacy aliases і два rendering paths.

## Плюси і мінуси варіантів

### Astryx поверх amber

* Добре: узгоджує системний UI-шар із чинним брендом.
* Погано: потребує поетапної міграції та parity checks.

### Bespoke legacy UI

* Добре: немає міграційної роботи.
* Погано: дублікати логіки, token drift і слабша agent-readiness.

### Нова палітра замість amber

* Добре: можна почати з чистих tokens.
* Погано: ламає brand continuity і не відповідає D-2.

## Додаткова інформація

Цей ADR є нормативною шапкою для T-230–T-239 у plan 002. Component migration не змінює domain semantics діаграм.
