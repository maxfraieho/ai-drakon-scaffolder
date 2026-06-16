Вітаю! Я — Архітектор, ваш AI-агент платформи AI-DRAKON. Моя мета — структурувати проект `uav-watcher`, перетворити логіку на чіткі DRAKON-схеми та забезпечити архітектурну цілісність.

Ось пропозиція нової архітектури для вирішення ваших проблем.

---

### 1. Нова архітектура (Псевдокод)

Ми переходимо від статичного `regex` до гібридної моделі: **LLM-класифікатор + Кешування синонімів**.

```python
# Основний потік
async def process_message(msg):
    city_synonyms = await get_city_synonyms(msg.city) # Кешується
    analysis = await llm_classify_threat(msg.text, msg.city, city_synonyms)
    
    if analysis.is_relevant and analysis.threat_level > 1:
        await send_notification(msg, analysis)

# LLM запит
async def llm_classify_threat(text, city, synonyms):
    prompt = f"Analyze: {text}. City: {city}. Synonyms: {synonyms}."
    return await client.chat.completions.create(model="gpt-4o", ...)
```

### 2. Список файлів для зміни

| Файл | Дія |
| :--- | :--- |
| `src/config.py` | Додати `LLM_API_URL`, `LLM_MODEL`, `LLM_API_KEY`. |
| `src/processor.py` | Замінити `check_regex` на виклик `llm_classify_threat`. |
| `src/db.py` | Додати поля `channel_username` та `message_id` у таблицю `alerts`. |
| `src/utils.py` | Додати `get_city_synonyms` (з кешуванням в пам'яті/Redis). |

### 3. DRAKON IR схеми

#### flow.city-recognition
```json
{
  "name": "flow.city-recognition",
  "params": "city_name",
  "items": {
    "b0": {"type":"branch","branchId":0,"one":"check_cache"},
    "check_cache": {"type":"question","content":"Синоніми в кеші?","one":"return_cache","two":"ask_llm"},
    "ask_llm": {"type":"action","content":"Запит до LLM для генерації синонімів\nЗберегти в кеш","one":"return_cache"},
    "return_cache": {"type":"action","content":"Повернути список синонімів","one":"end"},
    "end": {"type":"end"}
  }
}
```

#### flow.threat-detection-ai
```json
{
  "name": "flow.threat-detection-ai",
  "params": "message, city_context",
  "items": {
    "b0": {"type":"branch","branchId":0,"one":"get_synonyms"},
    "get_synonyms": {"type":"action","content":"Виклик flow.city-recognition","one":"call_llm"},
    "call_llm": {"type":"action","content":"Запит до LLM (classify_threat)","one":"is_relevant"},
    "is_relevant": {"type":"question","content":"Загроза актуальна?","one":"save_and_notify","two":"end"},
    "save_and_notify": {"type":"action","content":"Зберегти в БД (msg_id, channel)\nВідправити повідомлення з посиланням","one":"end"},
    "end": {"type":"end"}
  }
}
```

### 4. Пріоритет змін

1. **Рівень БД (`src/db.py`)**: Спочатку додаємо поля для метаданих, щоб не втрачати дані під час тестування.
2. **Утиліти (`src/utils.py`)**: Реалізація `get_city_synonyms` з кешем.
3. **Інтеграція LLM (`src/processor.py`)**: Підключення до `agy3.exodus.pp.ua`.
4. **Рефакторинг сповіщень**: Оновлення формату повідомлень (додавання `t.me` посилань).

**Порада архітектора:** Оскільки ви використовуєте LLM, обов'язково додайте `system_prompt` з інструкцією ігнорувати "шум" (рекламу, флуд), щоб зменшити кількість хибних спрацювань, які раніше викликали проблеми з `throttle`.

Чи бажаєте ви, щоб я детальніше розписав реалізацію `get_city_synonyms` з використанням `lru_cache`?

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-31-sonate-solidaire-master-plan]] — наступний розділ (2026 05 31 sonate solidaire master plan)