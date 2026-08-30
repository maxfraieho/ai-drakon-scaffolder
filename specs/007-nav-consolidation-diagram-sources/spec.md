# Spec 007: Consolidate Navigation and Unify Diagram Sources

## Мета

Реалізувати рішення [ADR-0028](../../docs/adr/0028-consolidate-navigation-and-unify-diagram-sources.md):
усунути дублювання навігаційних поверхонь (header + IconRail + sidebar,
до 3-4 місць для одного route) через єдине джерело конфігурації, видалити
мертвий legacy nav-код, та об'єднати відображення DRAKON-схем з двох
розсинхронізованих джерел (MinIO/localStorage vs GitHub git-tree) у
DRAKON tab і Workspace tab -- за тим самим патерном явного
source-позначення, що вже застосований для /agents в
[ADR-0027](../../docs/adr/0027-fix-harness-spec-race-and-agents-datasource.md).

## Інваріанти

- ASTRYX_NAV_ITEMS (src/components/astryx/astryx-nav-config.ts або еквівалент,
  перевір точний шлях через GitNexus/grep перед правкою) -- єдине
  джерело правди для ВСІХ nav-поверхонь, що показують список route-ів.
  Жоден компонент не має власного hardcoded масиву пунктів меню.
- IconRail (WorkspaceShell.tsx) рендериться з того самого конфіга, що
  header (AstryxHeader.tsx) і sidebar (AstryxSideNav.tsx) -- або
  видаляється як окрема поверхня, якщо після консолідації її функція
  повністю покривається sidebar (рішення приймається під час
  реалізації, задокументуй яке обрано і чому в коміт-повідомленні).
- /knowledge route або додається в ASTRYX_NAV_ITEMS, або прибирається
  з IconRail -- не лишається орфаном (присутнім лише в одній з
  N-поверхонь без відповідника в конфізі).
- AppLayout.tsx і AppHeader.tsx (src/components/app/) видаляються
  повністю ЛИШЕ після повторного підтвердження нуля імпортів (grep -r
  AppLayout або AppHeader src/ перед видаленням -- ADR-0028 підтвердив
  0 імпортів на момент дослідження 2026-08-30, але код міг змінитись).
- DRAKON tab (DiagramsPage.tsx) і Workspace tab (ProjectFileManager.tsx)
  показують ОБ'ЄДНАНИЙ список схем з обох джерел (MinIO/localStorage
  через readDiagramsFromStorage/api.listDiagrams, і GitHub git-tree
  через fetchNotesTree/githubGetFile), кожен елемент явно позначений
  джерелом (напр. source: "storage" | "git") -- за прикладом
  AgentsPage.tsx (source: "diagram" | "pipeline", ADR-0027).
- Різниця форматів файлів (.drakon.json vs .drakon) НЕ вирішується
  примусовою конвертацією в цьому spec -- обидва формати показуються й
  редагуються кожен своїм існуючим шляхом; уніфікація формату -- поза
  межами.
- Tenant isolation (ADR-0025) не порушується жодною зі змін -- жоден
  новий/змінений метод репозиторію не приймає tenantId як параметр
  виклику.

## Межі

Роль-гейт (Worker/Supervisor spaces, приховування Dev Studio за роллю)
лишається заблокованим на resolveTenant() membership-lookup
(packages/tenancy/src/index.ts:79) -- поза межами цього spec, статус
не змінюється відносно ADR-0027/ADR-0028.
Конвертація формату .drakon в .drakon.json (або навпаки) в один
формат -- поза межами.
Візуальний рескін (Genspark-токени) для нових/змінених елементів
навігації -- окремий трек через docs/plans/genspark-astryx-redesign/,
не частина цього spec (цей spec -- структурна робота, не CSS).

## Реалізація

Делегується Pi + deepseek-v4-flash на .234, гілка
design-system/astryx-genspark (та сама, де вже застосовані
Genspark-токени для /agents -- дизайн і структура консолідуються в
одній гілці за рішенням Q).
Кожен з 3 пунктів (nav-конфіг, видалення мертвого коду,
diagram-source unification) -- окремий коміт. Методика:
.pi/skills/ai-drakon-sdd-discipline.md (вже в гілці).
