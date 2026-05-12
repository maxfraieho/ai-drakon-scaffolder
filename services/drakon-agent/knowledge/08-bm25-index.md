# Індекс бази знань DRAKON-агента для векторного та BM25 пошуку

Цей індекс спроєктований для гібридного пошуку (FTS5 + векторні ембединги) у локальних базах знань (наприклад, SQLite), забезпечуючи високу точність вибірки специфічних інженерних правил LLM-агентами.
Анотації файлів та ключові терміни
      * 01-diagram-types.md: Критерії автоматичного вибору між діаграмами Primitive та Silhouette на основі цикломатичної складності   . Визначення "шампура" (Skewer), ідентифікація happy path, точки входу b0 та терміналу end.
      * 02-icon-semantics.md: Повна таксономія іконок drakonwidget.js (action, question, branch, insertion, address, loop_start). Семантика плоского JSON-словника та мапінг базових вузлів AST на візуальні елементи.
      * 03-content-labeling.md: Правила семантичного підпису. Трансформація Python-коду в дієслівні фрази, скорочення складних умов через розбиття на атомарні булеві питання ("візуальні формули"), іменування гілок Силуету за хронологією.
      * 04-ast-mapping.md: Довідкова матриця трансляції синтаксису Python (If, For, Try, Raise) у DRAKON IR. Обробка ast.ExceptHandler, спрощення ast.ListComp (orphan trimming), та поведінка асинхронного await.
      * 05-rightward-degradation.md: Фундаментальна евристика правого зміщення (Rightward Degradation). Семантичне розмежування покажчиків yes (down) для успіху та no (right) для помилок, включаючи інверсію логіки у Guard clauses.
      * 06-validation-metrics.md: Кількісні метрики оцінки алгоритмічної структури: SIS (Skewer Integrity Score > 0.40) та RDC (Rightward Degradation Count <= 4). Механізми Graph Validator (DFS orphan trimming, виправлення множинних end, усунення Anti-Twin error).
      * 07-code-patterns.md: Еталонні JSON-шаблони плоского словника items для типових конструкцій програмування: Guard clause, Try/except, Loop with break, Strategy (elif chain), Pipeline, Рекурсія.
Стратегія оновлення бази знань через codetomd.py
Автономний LLM-агент здатний еволюціонувати та підтримувати узгодженість своїх навичок з кодовою базою лише за наявності автоматизованого конвеєра оновлення пам'яті.
Скрипт scripts/codetomd/codetomd.py виконує роль "інгектора" (ingestion layer), який збирає вихідний код, документацію та конфігураційні файли проєкту в структуровані Markdown-артефакти.
         * Інтеграція в Knowledge Base: Згенеровані Markdown-файли розбиваються на логічні фрагменти (semantic chunking) за допомогою заголовків ##. Ці фрагменти записуються в локальну базу даних (наприклад, Chroma або SQLite з підтримкою FTS5/sqlite-vec), утворюючи пам'ять агента, до якої він звертається через протокол MCP (Model Context Protocol) під час виконання кожного завдання.
         * Критичні артефакти для індексації: Найбільшу цінність для агента становлять: 1) JSON Schemas (наприклад, Zod-валідатори для drakonwidget.js), оскільки вони гарантують безпомилкову генерацію синтаксису IR 1; 2) Код Graph Validator, який дозволяє агенту заздалегідь розуміти, як саме його "галюцинації" будуть виправлятися детермінованим рушієм (наприклад, обрізання сиріт) 1; 3) System Prompts, які формалізують рольову поведінку та забороняють генерацію 2D-координат.
         * Автоматизація: Стратегія підтримки актуальності полягає у запуску codetomd.py як post-commit hook у CI/CD конвеєрі. Зміни в коді мікросервісів або рушіях макетування автоматично оновлюють Markdown-файли, після чого оновлені чанки перераховуються (re-embedding) і записуються в базу, гарантуючи, що агент завжди використовує гібридний пошук по найсвіжіших інженерних специфікаціях.
Джерела

### 1. Дослідження мови візуального програмування DRAKON.pdf
         2. DRAKON Language Reference - DrakonFlow, доступ отримано травня 12, 2026, https://drakonflow.com/read/drakon-reference
         3. memweave: Zero-Infra AI Agent Memory with Markdown and SQLite — No Vector Database Required | Towards Data Science, доступ отримано травня 12, 2026, https://towardsdatascience.com/memweave-zero-infra-ai-agent-memory-with-markdown-and-sqlite-no-vector-database-required/

### 4. memtomem - GitHub, доступ отримано травня 12, 2026, https://github.com/memtomem/memtomem
         5. New framework lets AI agents rewrite their own skills without retraining the underlying model, доступ отримано травня 12, 2026, https://venturebeat.com/orchestration/new-framework-lets-ai-agents-rewrite-their-own-skills-without-retraining-the
         6. What Is an LLM Knowledge Base? How Karpathy's Wiki Architecture Works - MindStudio, доступ отримано травня 12, 2026, https://www.mindstudio.ai/blog/what-is-llm-knowledge-base-karpathy-wiki-architecture
         7. Using BM25 to Supercharge AI Agents | Lusera Tech, доступ отримано травня 12, 2026, https://www.luseratech.com/ai-agents/using-bm25-to-supercharge-ai-agents