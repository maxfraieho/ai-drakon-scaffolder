# Глибокий аналіз CodePage + Worker GitHub Routes (TASK-52)

**Дата:** 2026-05-29  
**Виконавець:** `agt-ogy3` (AGY3 tablet)  
**Репозиторій:** `~/workspace/ai-drakon-scaffolder`

---

## 1. Критичні баги (ламають функціонал)

### 1.1. Повна відсутність роутів `/v1/projects/*` у Cloudflare Worker
* **Файл:** `cloudflare-worker/worker-mcp-drakon.js`
* **Опис:** Веб-інтерфейс у `ProjectSelector.tsx` намагається створювати та видаляти проекти через виклики `api.addProject` та `api.deleteProject`, які звертаються до `${resolveApiBase()}/v1/projects/add` та `${resolveApiBase()}/v1/projects/:slug` відповідно. Проте у Cloudflare воркері повністю відсутні ці маршрути (немає жодної згадки слова `projects` у логіці маршрутизації). В результаті будь-яка спроба додати або видалити проект через UI завершується помилкою HTTP 404 (Not Found), роблячи управління проектами з браузера повністю неможливим.
* **Наслідки:** Користувач не може створювати нові проекти або видаляти існуючі через графічний інтерфейс.

### 1.2. Стейл-данні при перемиканні проектів у `CodePage.tsx` (Ризик перезапису коду)
* **Файл:** [CodePage.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx)
* **Опис:** Коли користувач змінює активний проект у шапці додатку, контекст `activeProject` оновлюється. Проте у `CodePage.tsx` немає жодного `useEffect`, який би реагував на зміну `activeProject` (або `owner`/`repo`) та очищував поточні стейти редактора: `code`, `filePath` (який за замовчуванням `untitled.py` або шлях попереднього файлу) та `fileSha`.
* **Наслідки:** Якщо користувач відкрив файл `src/main.py` у Проекті А, переключився на Проект Б і натиснув кнопка "Save to git", поточний код з Проекту А буде закомічено в Проект Б за шляхом `src/main.py`. Це призводить до критичного пошкодження даних та перезапису коду між різними репозиторіями.

### 1.3. Збереження видаленого проекту як активного у `ProjectContext.tsx`
* **Файл:** [ProjectContext.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/context/ProjectContext.tsx)
* **Опис:** Під час видалення проекту у `ProjectSelector.tsx` викликається `api.deleteProject` і потім оновлюється список через `loadProjects()`. У методі `loadProjects` стан активного проекту оновлюється так:
  ```typescript
  setActiveProjectState((prev) => {
    if (prev) {
      const updated = parsed.find((p) => p.slug === prev.slug);
      return updated ?? prev;
    }
    return saved ?? parsed[0] ?? null;
  });
  ```
  Якщо активний проект (`prev`) був щойно видалений, `updated` буде `undefined`, і функція поверне `prev` (видалений проект).
* **Наслідки:** Після видалення активного проекту інтерфейс продовжує відображати його як активний, а запити до його файлів чи діаграм завершуються помилками.

### 1.4. Відсутність оптимістичного блокування та передачі `fileSha` при комітах
* **Файли:** [CodePage.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx), [api.ts](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/lib/api.ts), `cloudflare-worker/worker-mcp-drakon.js`
* **Опис:** `CodePage.tsx` успішно зберігає `fileSha` у стейт при завантаженні файлу, проте функція `api.githubCommitFile` не приймає та не передає `sha` на воркер. Воркер перед відправкою PUT-запиту в GitHub самостійно робить GET-запит на GitHub для отримання актуального SHA файлу:
  ```javascript
  let sha;
  try {
    const existing = await githubFetch(env, `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, ...);
    sha = existing.sha;
  } catch { sha = undefined; }
  ```
* **Наслідки:** Це повністю ламає механізм запобігання конфліктам (optimistic locking). Якщо два розробники одночасно відчинили файл, перший зберіг свої зміни, а потім другий зберіг свої — воркер другого розробника просто отримає новий SHA з GitHub та затре зміни першого розробника без жодних попереджень.

---

## 2. Потенційні проблеми (edge cases)

### 2.1. Витік пам'яті (Memory Leak) через незакритий `pollRef`
* **Файл:** [CodePage.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx)
* **Опис:** При запуску аналізу коду (`analyze()`) створюється інтервал `setInterval`, який кожні 1.5 секунди опитує стан завдання. Посилання зберігається в `pollRef.current`. Проте в компоненті відсутній `useEffect` з функцією очищення (`cleanup`), яка б викликала `clearInterval(pollRef.current)` при розмонтуванні сторінки (unmount).
* **Наслідки:** Якщо користувач перейде на іншу вкладку під час аналізу, інтервал продовжить працювати (до 60 ітерацій / 90 секунд), намагаючись оновити стан розмонтованого компонента, що викликає витік пам'яті та попередження в консолі React.

### 2.2. Серйозна вразливість безпеки: Публічний доступ до GitHub API через токен воркера
* **Файл:** `cloudflare-worker/worker-mcp-drakon.js`
* **Опис:** Маршрути `/v1/github/tree`, `/v1/github/file` та `/v1/github/branches` обробляються до виклику `verifyOwnerAuth`. Більше того, функція `githubHeaders` влаштована так:
  ```javascript
  const token = String(requestToken || env.GITHUB_TOKEN || '').trim();
  ```
  Якщо клієнт не передає заголовок `X-Github-Token` (тобто не авторизований або не налаштував власний токен), воркер бере серверний `env.GITHUB_TOKEN`.
* **Наслідки:** Будь-яка особа в інтернеті може надсилати запити на воркер для читання будь-яких публічних/приватних репозиторіїв, використовуючи ліміти та права доступу серверного токена розробника платформи.

### 2.3. Збій стану дерева файлів `FileTree` при перемиканні проектів
* **Файл:** [CodePage.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx) (компонент `FileTree`)
* **Опис:** Хоча зміна `owner`/`repo` оновлює callback `load` і викликає перезавантаження корня репозиторію (`load("")`), внутрішні стейти компонента `currentPath` та `pathStack` не скидаються.
* **Наслідки:** Якщо користувач зайшов у глибоку директорію `src/components/ui` в Проекті А, а потім вибрав Проект Б, інтерфейс покаже корінь Проекту Б, але заголовок буде стверджувати, що ми в `src/components/ui`. Спроба оновити дерево (`refresh()`) надішле запит на отримання неіснуючого шляху `src/components/ui` у Проекті Б, викликавши помилку завантаження.

### 2.4. Перетворення помилок 404 від GitHub у HTTP 500
* **Файл:** `cloudflare-worker/worker-mcp-drakon.js`
* **Опис:** Будь-яка помилка при виклику `githubFetch` (наприклад, якщо репозиторій не існує або видалений — HTTP 404) викликає виключення `throw new Error(...)`. Це виключення перехоплюється загальним `catch (e)` воркера, який повертає клієнту статус HTTP 500 (Internal Error).
* **Наслідки:** Неможливо відрізнити реальну внутрішню помилку сервера від ситуації, коли користувач просто ввів неіснуючий репозиторій.

---

## 3. UX проблеми (незрозуміло для користувача)

### 3.1. Відсутність деталізації помилок при збереженні або завантаженні файлів
* **Файл:** [CodePage.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx)
* **Опис:** При виникненні будь-яких помилок у `saveToGit` або `openFile` користувач бачить лише загальний тост `Не вдалося завантажити файл` чи `Помилка збереження`.
* **Рекомендація:** Виводити повідомлення з помилки, повернутої сервером (наприклад, `Помилка збереження: невірний токен GitHub` або `Код 404: файл не знайдено`).

### 3.2. Статичність списку проектів у контексті
* **Файл:** [ProjectContext.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/context/ProjectContext.tsx)
* **Опис:** Завантаження списку проектів відбувається лише один раз при старті додатку через `useEffect`. Якщо проекти оновлюються на серверній стороні (через іншу сесію чи CLI), інтерфейс не дізнається про це без повного перезавантаження сторінки.

### 3.3. Дублювання та неузгодженість конфігурації GitHub
* **Файл:** [CodePage.tsx](file:///data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/src/pages/CodePage.tsx)
* **Опис:** Значення `owner`, `repo` та `branch` визначаються через складну каскадну логіку: спочатку перевіряються налаштування проекту, а потім — глобальний `getGithubConfig()`. Для користувача залишається абсолютно непрозорим, під яким саме акаунтом та в який репозиторій зараз буде збережено файл.

---

## 4. Рекомендовані фікси (пріоритет: критичні спочатку)

### 1. Додати підтримку проектів у Cloudflare Worker (Критично)
Створити обробники `/v1/projects/*` у воркері, які будуть перенаправляти запити на відповідний `architect-agent` (аналогічно проксіюванню `/v1/agents/pipeline`):
```javascript
if (path.startsWith('/v1/projects')) {
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  const targetUrl = architectUrl + path.replace('/v1/projects', '/projects') + (url.search || '');
  const proxied = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });
  return fetch(proxied);
}
```

### 2. Скидати стан FileTree та редактора при зміні проекту (Критично)
* Додати в `CodePage.tsx`:
```typescript
useEffect(() => {
  // Скидання файлу та коду при перемиканні проекту
  setCode("");
  setFilePath("untitled.py");
  setFileSha(null);
  setResult(null);
}, [activeProject?.slug]);
```
* Додати в `FileTree` всередині `CodePage.tsx`:
```typescript
useEffect(() => {
  // Скидання шляху всередині дерева при зміні репозиторію
  setCurrentPath("");
  setPathStack([]);
}, [owner, repo]);
```

### 3. Виправити логіку видалення активного проекту у `ProjectContext.tsx` (Критично)
Оновити `setActiveProjectState` в `loadProjects`:
```typescript
setActiveProjectState((prev) => {
  if (prev) {
    const updated = parsed.find((p) => p.slug === prev.slug);
    // Якщо проект видалено, скидаємо на перший доступний або null
    return updated ?? parsed[0] ?? null;
  }
  return saved ?? parsed[0] ?? null;
});
```

### 4. Очищення інтервалу при розмонтуванні сторінки (Високий пріоритет)
Додати `useEffect` у `CodePage.tsx` для очищення `pollRef`:
```typescript
useEffect(() => {
  return () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };
}, []);
```

### 5. Авторизація публічних роутів GitHub (Високий пріоритет)
Перенести авторизацію `verifyOwnerAuth` у воркері вище обробки `/v1/github/*` роутів, щоб запобігти неавторизованому використанню серверного токена.

## Семантичні зв'язки
**Цей документ є частиною:** [[reports/_INDEX]]

**Цей документ пов'язаний з:**
- [[reports/_INDEX]] — переглянути всі документи розділу