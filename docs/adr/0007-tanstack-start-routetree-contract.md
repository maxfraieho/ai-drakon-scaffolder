---
status: "accepted"
date: 2026-08-18
deciders: "оператор + Codex"
spec: "specs/000-baseline"
supersedes: null
superseded-by: null
---

# 0007. Використовувати TanStack Start/Router і синхронний generated route tree

## Контекст і формулювання проблеми

AI-DRAKON використовує TanStack Start/Router для SSR та file-based routing. `routeTree.gen.ts` є generated artifact, а не місцем для ручного редагування. F2 показав, що різні generated trees у `src/` і `.lovable/src/` можуть дати різну навігацію: `TraceRoute` і `TutorialRoute` були відсутні в одному checkout.

## Рушії рішення

* SSR і file-based routing TanStack;
* відтворювана генерація маршрутів;
* однакова навігація в dev і Cloudflare Pages.

## Розглянуті варіанти

* TanStack Start/Router з generated `routeTree.gen.ts`;
* ручне редагування route tree;
* перехід на інший routing stack.

## Підсумок рішення

Обрано TanStack Start/Router. Після додавання або зміни route file route tree регенерується штатним Vite/TanStack tooling, потім результат синхронізується у двох checkout paths через `rsync -av --delete src/ .lovable/src/`. CI перевіряє, що обидва `routeTree.gen.ts` ідентичні.

### Наслідки

* Добре: route tree відповідає source routes і не має ручного drift.
* Добре: dev і production мають однаковий routing surface.
* Погано: generated artifact треба додавати до commit після регенерації.

## Плюси і мінуси варіантів

### TanStack generated route tree

* Добре: підтримується file-based routing і SSR.
* Погано: потрібні generator і parity gate.

### Ручний route tree

* Добре: швидка точкова правка.
* Погано: легко пропустити imports, children або route type entries.

### Інший routing stack

* Добре: можливі інші SSR/deployment trade-offs.
* Погано: висока ціна міграції без проблеми, що виправдовує її.

## Додаткова інформація

ADR-0006 визначає mirror/build contract; цей ADR уточнює generated artifact і CI parity gate.
