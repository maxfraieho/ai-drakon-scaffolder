# 03_api_reference.md: OpenWiki API Reference

Документ описує програмні інтерфейси (API) для взаємодії з Cloudflare Worker (`drakon-antigravity-worker`) та інтеграцією NotebookLM MCP.

## 1. Авторизація

Усі захищені ендпоінти вимагають автентифікації на базі Appwrite Auth. Токен передається у заголовку запиту:

```http
Authorization: Bearer <jwt>
```

## 2. Ендпоінти Cloudflare Worker

Обслуговуються через Cloudflare Worker проксі (`drakon-antigravity-worker`).

### 2.1. Генерація коду
**POST** `/v1/codegen`

* **Request Body:**
  ```json
  {
    "description": "Calculate factorial recursively",
    "functionName": "factorial",
    "language": "JS2604",
    "params": "n"
  }
  ```
* **Response (202 Accepted):**
  ```json
  {
    "execution_id": "string",
    "status": "accepted"
  }
  ```

### 2.2. Статус генерації коду
**GET** `/v1/codegen-status?execution_id={id}`

* **Response (200 OK):**
  ```json
  {
    "execution_id": "string",
    "status": "completed | in_progress | failed",
    "result": "string (generated code)"
  }
  ```

### 2.3. Чат з AI Агентами
**POST** `/v1/agents/{id}/chat`
* **Path params:** `id` - `"drakon" | "architect" | "docs" | "sonate-solidaire"`
* **Request Body:**
  ```json
  {
    "message": "string",
    "context": {}
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "reply": "string",
    "diagrams": []
  }
  ```

### 2.4. Документація API
**GET** `/v1/docs/*`
* Проксі до `docs-agent` для читання документації, вікі-посилань та нотаток.

---

## 3. Ендпоінти NotebookLM MCP

### 3.1. Перелік блокнотів
**POST** `/api/notebooklm/notebooks` (або `notebooks_list`)

### 3.2. Чат з блокнотом NotebookLM
**POST** `/api/notebooklm/chat`
* **Request Body:**
  ```json
  {
    "notebookId": "5795bbbe-fcf8-48f5-bc2c-daff5bcb798a",
    "question": "string"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "answer": "string",
    "citations": []
  }
  ```

---

## 4. Коди помилок (Error Codes)

* **400 Bad Request:** Невірно сформований запит.
* **401 Unauthorized:** Відсутній або недійсний JWT токен.
* **404 Not Found:** Запитуваний ресурс не існує.
* **500 Internal Server Error:** Помилка Worker або бекенду Appwrite.
