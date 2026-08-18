# 02_architecture_flows.md

## 1. Взаємодія Frontend -> Cloudflare Worker -> Appwrite / LLM Gateway

Архітектура платформи **AI-DRAKON Scaffolder** побудована на розділенні шарів (UI, Proxy-Gateway, Backend):

* **Frontend (Клієнтські елементи)**: Інтерфейс побудований з використанням дизайн-системи Astryx (React 18/19 + Tailwind CSS) та розгортається на Cloudflare Pages. Маршрутизація та SSR виконуються через TanStack Start + TanStack Router (компілюється з `.lovable/src/`).
* **Cloudflare Worker (`drakon-antigravity-worker`)**: Виступає в ролі Proxy та Gateway між фронтендом та бекенд-сервісами, забезпечуючи маскування ключів та маршрутизацію API.
* **Appwrite Cloud / LLM Gateway**: Основний бекенд для автентифікації (Auth/Functions), зберігання даних та AI кодогенерації.

---

## 2. Процес генерації коду ДРАКОН

Асинхронний процес генерації коду з візуальної схеми ДРАКОН (від запиту до опитування статусу):

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend (Astryx UI)
    participant Worker as Cloudflare Worker<br/>(drakon-antigravity-worker)
    participant Backend as Appwrite Functions /<br/>LLM Gateway

    Client->>Worker: POST /v1/codegen (DRAKON schema payload)
    activate Worker
    Worker->>Backend: Ініціалізація задачі генерації коду
    activate Backend
    Backend-->>Worker: Повернення Job ID (Task Created)
    deactivate Backend
    Worker-->>Client: 202 Accepted (Job ID)
    deactivate Worker

    loop Status Polling (Опитування статусу)
        Client->>Worker: GET /v1/codegen-status?execution_id={Job ID}
        activate Worker
        Worker->>Backend: Запит статусу виконання
        activate Backend
        Backend-->>Worker: Статус: Processing / In Progress
        deactivate Backend
        Worker-->>Client: 200 OK (Status: Processing)
        deactivate Worker
    end

    Client->>Worker: GET /v1/codegen-status?execution_id={Job ID}
    activate Worker
    Worker->>Backend: Запит статусу виконання
    activate Backend
    Backend-->>Worker: Статус: Completed (Згенерований код)
    deactivate Backend
    Worker-->>Client: 200 OK (Status: Completed, Result: Source Code)
    deactivate Worker
```

---

## 3. Обробка SSR та ClientOnly

Frontend використовує React + TanStack Router; цей repository build не слід описувати як підтверджений TanStack Start SSR runtime.

* **Проблема SSR-гідрації**: Компоненти `DrakonEditor.tsx`, `yjs` (WebRTC) та `@monaco-editor/react` безпосередньо звертаються до `window`, `document` та Canvas API, що під час SSR викликає `ReferenceError`.
* **Рішення (`ClientOnly.tsx`)**: Використовується захисний компонент `src/components/app/ClientOnly.tsx`, який відкладає рендеринг Canvas, Yjs та Monaco до моменту монтування на клієнті.
