# Channel Feed → Agent Memory Integration
> uav-watcher: userbot читає канали → агент завжди в курсі обстановки

---

## Архітектура

```
Telegram-канали (5 штук)
    ↓  Telethon userbot (uav_watcher.py)
    ↓  фільтр: city_keywords match → ai_classify()
    │
    ├─► [ІСНУЮЧЕ] send_notification() → Telegram Bot API → користувач
    │
    └─► [НОВЕ] feed_message()
              ↓
         consultant/memory/channel_feed.db
         (SQLite ring buffer, 500 повідомлень)
              │
              ├─► [background, кожні 5хв]
              │   channel_feed.summarizer → LLM → channel_summary.json
              │
              └─► [на кожен /chat запит]
                  pipeline/nodes.py → retrieve_kb()
                      ├─ read_channel_summary()   ← стисле AI-зведення
                      └─ get_recent_formatted()   ← сирі повідомлення
                                                    (тільки якщо є time-sensitive
                                                     keywords в запиті)
```

---

## Нові файли

| Файл | Призначення |
|------|-------------|
| `consultant/memory/channel_feed.py` | SQLite ring buffer. `feed_message()` / `get_recent_formatted()` |
| `consultant/memory/summarizer.py` | Фоновий потік: читає feed → AI → `channel_summary.json` |

## Патчі існуючих файлів

| Файл | Зміна | Рядки |
|------|-------|-------|
| `uav_watcher.py` | +7 рядків в `handler()` після `log.info(f"No threat...")` | ~3801 |
| `consultant/pipeline/nodes.py` | `retrieve_kb()` → додати 2 блоки контексту | ~9275 |
| `consultant/main.py` | `lifespan()` → `start_summarizer()` + 2 нових endpoint | ~7136 |

---

## Потік даних детально

### 1. Userbot → Feed (real-time)

```python
# uav_watcher.py — handler() — КОЖНЕ повідомлення що пройшло keyword filter
feed_message(
    text=text,              # повний текст повідомлення
    channel_id=event.chat_id,
    channel_title="Повітряна Тривога",
    is_threat=is_threat,    # True/False від AI
    reason=reason,          # "БПЛА підтверджено над Кіровоградщиною"
)
```

Зберігається в `consultant/memory/channel_feed.db`:
```sql
INSERT INTO feed (ts, channel_id, channel_title, text, is_threat, reason)
VALUES (1716123456, -1001766138888, "Повітряна Тривога", "...", 1, "БПЛА...")
```

Ring buffer: якщо > 500 записів → старі видаляються автоматично.

### 2. Background Summarizer (кожні 5 хв)

Читає останні 30 повідомлень → відправляє в LLM:

```
Складіть тактичне зведення:
[09:41] 📡 Повітряна Тривога 🚨
Увага! БПЛА в бік Кіровоградщини, підтверджено рух...
  ↳ AI: БПЛА атака підтверджена

[09:43] 📡 Суспільне Кропивницький
Оголошено повітряну тривогу в Кіровоградській області...
```

Отримує → зберігає в `consultant/memory/channel_summary.json`:
```json
{
  "ts": 1716123600,
  "summary": "Зафіксовано загрозу БПЛА над Кіровоградщиною. Тривога активна з 09:41. Рекомендовано перейти в укриття.",
  "threat_count_1h": 2
}
```

### 3. Agent Context Injection (на кожен /chat)

`pipeline/nodes.py → retrieve_kb()` збирає контекст шарами:

```
[Зведення з каналів моніторингу]
Зафіксовано загрозу БПЛА над Кіровоградщиною. Тривога активна з 09:41.
(підтверджених загроз за останню годину: 2)

[Поточна ситуація з тривогами]          ← alerts.in.ua (існуючий)
Зараз активно 4 повітряних тривог: Кіровоградська, Харківська...

[База знань]                             ← BM25 knowledge/ (існуючий)
### Дії при загрозі БПЛА
...

[Повідомлення з каналів — якщо запит time-sensitive]
[09:41] 📡 Повітряна Тривога 🚨
Увага! БПЛА в бік Кіровоградщини...
```

Агент бачить **всі три рівні** і відповідає з урахуванням поточної обстановки.

---

## Приклади поведінки агента

**До інтеграції:**
> Користувач: "Що зараз відбувається?"
> Агент: "Дані ще не завантажені або застаріли."

**Після інтеграції:**
> Користувач: "Що зараз відбувається?"
> Агент: "За повідомленнями з каналів (09:41-09:55), зафіксовано загрозу БПЛА над Кіровоградщиною.
>          Офіційна тривога активна. Перейдіть в укриття — правило двох стін або підвал."

---

**До:**
> Користувач: "Є загроза БПЛА зараз?"
> Агент: "Я не маю доступу до поточних даних..."

**Після:**
> Агент: "Так, о 09:41 каналом 'Повітряна Тривога' підтверджено рух БПЛА в бік Кіровоградщини.
>          AI-класифікатор позначив повідомлення як підтверджену загрозу. Негайно в укриття."

---

## Кроки встановлення

```bash
# 1. Скопіювати нові файли
cp consultant/memory/channel_feed.py   ~/uav-watcher/consultant/memory/
cp consultant/memory/summarizer.py     ~/uav-watcher/consultant/memory/

# 2. Переконатися що __init__.py існує
touch ~/uav-watcher/consultant/memory/__init__.py

# 3. Застосувати patches.py — відредагувати вручну:
#    - uav_watcher.py: додати 7 рядків після "No threat"
#    - consultant/pipeline/nodes.py: замінити retrieve_kb()
#    - consultant/main.py: додати start_summarizer() + 2 endpoints

# 4. Перезапустити обидва сервіси
sudo rc-service uav-watcher restart
# або
cd ~/uav-watcher && bash start.sh
```

## Перевірка

```bash
# Перевірити що feed пишеться (через 1-2 хв після запуску, якщо є повідомлення)
python3 -c "
import sys; sys.path.insert(0, 'consultant')
from memory.channel_feed import get_stats, get_recent_formatted
print(get_stats())
print(get_recent_formatted(limit=5))
"

# Перевірити endpoint
curl http://localhost:8770/feed

# Перевірити що агент бачить канали
curl -X POST http://localhost:8770/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "що зараз відбувається?"}'
```

---

## Налаштування `config.json`

Нічого додавати не потрібно — `channel_feed.py` бере LLM config з того ж `config.json`:
```json
{
  "llm_proxy_url": "https://openai-proxy.exodus.pp.ua/v1",
  "llm_proxy_token": "freecc",
  "llm_proxy_model": "docs-assistant-proxy"
}
```

---

## Що НЕ змінено

- ✅ Логіка `uav_watcher.py` — жодних змін в існуючому pipeline
- ✅ `send_notification()` — працює як і раніше
- ✅ `situation_watcher.py` — alerts.in.ua polling не зачеплено
- ✅ BM25 knowledge base — не змінено
- ✅ LangGraph pipeline structure — тільки додано шари в `retrieve_kb()`

---

## Параметри ring buffer

| Параметр | Значення | Де змінити |
|----------|----------|-----------|
| `MAX_ROWS` | 500 повідомлень | `channel_feed.py:25` |
| `CONTEXT_LIMIT` | 40 для `get_recent()` | `channel_feed.py:27` |
| `MAX_AGE_SEC` | 2 години | `channel_feed.py:29` |
| `SUMMARY_INTERVAL_SEC` | 5 хвилин | `summarizer.py:38` |
| `MAX_AGE_VALID_SEC` | 10 хвилин | `summarizer.py:39` |
| LLM prompt | | `summarizer.py:45` |
