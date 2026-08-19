# ADR Assets

Цей каталог містить SVG-файли DRAKON-діаграм, які вбудовуються в ADR-записи.

## Конвенція іменування

```
{ADR-number}-{diagram-slug}.svg
```

**Приклади:**
- `0015-pipeline-flow.svg`
- `0003-gitnexus-architecture.svg`

## Використання в ADR

```markdown
## DRAKON-схема

![DRAKON: назва діаграми](./assets/0015-pipeline-flow.svg)

[▶ Відкрити у редакторі](/studio?diagramId={id})
```

## Immutability

SVG-файли для accepted/deprecated ADR підпадають під immutability-контракт:
- Якщо ADR `NNNN` має `status: "accepted"` — файли `NNNN-*.svg` **не редагуються**
- Зміна діаграми → новий ADR із `supersedes`, новий SVG snapshot

Див. [ADR-0015](../0015-drakon-embedded-adr-documentation.md).
