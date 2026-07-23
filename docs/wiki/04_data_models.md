# 04_data_models.md

Опис моделей даних та управління станом для проєкту AI-DRAKON Scaffolder.

## 1. Appwrite колекції та Auth токени

* **Auth токени**: Аутентифікація реалізується через JWT сесій Appwrite (`Authorization: Bearer <jwt>`).
* **Проекти та Діаграми**: Метадані збережених графічних схем ДРАКОН, доступ та права власника.

---

## 2. ДРАКОН діаграми та IR схеми

* **ДРАКОН діаграми**: Canvas-модель елементів палітри ДРАКОН у `DrakonEditor.tsx`. Синхронізація у реальному часі за допомогою Yjs CRDT (WebRTC).
* **IR (Intermediate Representation) схеми**: Формат викликів вузлів ("Дія", "Умова", "Шампур") перед генерацією коду та передачею до Monaco Editor.

---

## 3. Zustand та React Query канали стану

* **React Query (Серверний стан)**: Кешування діаграм та інформації про користувача.
* **Zustand (Клієнтський UI-стан)**:
  * *Nav Store*: Єдине джерело правди для `AstryxHeader` та `AstryxSideNav` (`astryx-nav-config.ts`).
  * *Editor Store*: Стан діалогів (`NewDrakonDialog`), палітри та форматирування (`FormatInspector`).

---

## 4. Схема сутностей (ER Diagram)

```mermaid
erDiagram
    APPWRITE_USER ||--o{ PROJECT : "owns (Auth Token)"
    APPWRITE_USER {
        string id PK
        string email
        string current_session_token
    }
    
    PROJECT ||--o{ DRAKON_DIAGRAM : "contains"
    PROJECT {
        string id PK
        string owner_id FK
        string name
        datetime created_at
    }
    
    DRAKON_DIAGRAM ||--o{ YJS_CRDT_STATE : "syncs via WebRTC"
    DRAKON_DIAGRAM {
        string id PK
        string project_id FK
        string diagram_title
        json ir_schema
    }
    
    YJS_CRDT_STATE {
        string id PK
        string diagram_id FK
        binary update_buffer
    }
    
    DRAKON_DIAGRAM ||--o{ CANVAS_NODE : "renders"
    CANVAS_NODE {
        string id PK
        string diagram_id FK
        string node_type "Action | Condition | Loop"
        float pos_x
        float pos_y
    }
```
