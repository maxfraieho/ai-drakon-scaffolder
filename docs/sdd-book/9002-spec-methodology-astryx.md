# Spec 002: Методологічна база та Astryx brownfield refactor

## Мета

Зафіксувати архітектурні рішення SDD, актуальний GitNexus gate і поетапний
перехід frontend на Astryx поверх amber AI-DRAKON без зміни чинного
codegen API та без розриву production build contract.

## Інваріанти

- ADR-0006/0007 визначають parity `src/` ↔ `.lovable/src/` і generated route tree.
- ADR-0008 визначає evidence-based arbiter promotion.
- ADR-0009 визначає Astryx як canonical UI layer поверх amber identity.
- Після змін у `src/` дзеркало синхронізується через `rsync -av --delete src/ .lovable/src/`.
- `generateDrakonCode` і GWT-сценарії baseline spec не змінюються в межах цієї фічі.

## Межі

План і tasks деталізовані у [plan.md](plan.md). Backend security tasks T-225–T-229
не виконуються в межах поточного Codex-запуску; frontend migration T-230–T-239
залишається наступною фазою після Task 1.
