# drakon-agent

FastAPI мікросервіс: Python код → DRAKON IR діаграми.

**Детальна документація:** [docs/architecture.md](docs/architecture.md)

## Швидкий старт

```bash
cd services/drakon-agent
cp .env.example .env
.venv/bin/python3 main.py
```

## Пайплайн

```
Python code → AST Analyzer → BM25 KB lookup → AI Refiner → Validator → DRAKON IR
```

## API

| Endpoint | Метод | Опис |
|----------|-------|------|
| `/health` | GET | Перевірка сервісу |
| `/analyze` | POST | Python code → список DRAKON IR |
| `/feedback` | POST | Зворотний зв'язок для покращення |

### Приклад

```bash
curl -X POST http://localhost:8765/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "def greet(name):\n  if not name:\n    return \'anon\'\n  return \'Hi \' + name", "refine": false}'
```

## Вимоги

- Python 3.11+
- venv з `--system-site-packages` (AMD C-60 без AVX, потрібен system numpy)
- OpenAI-сумісний proxy на `localhost:18880` (для `refine=true`)
