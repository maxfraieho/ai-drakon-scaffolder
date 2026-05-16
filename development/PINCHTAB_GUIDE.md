# PinchTab — Практичний гайд

## Конфігурація

- Server: `http://localhost:9867` на 192.168.3.184
- Token: `0117419fcfb5de5d82220c1f9da8de97`
- MCP: підключений через SSH stdio в `~/.claude.json`

## КРИТИЧНО: Завжди curl, НІКОЛИ MCP screenshot

MCP `pinchtab_screenshot` повертає base64 у контекст = тисячі токенів.
Замість цього — curl HTTP API напряму на dev сервері:

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
   "http://localhost:9867/screenshot?raw=true&tabId=TAB_ID&format=jpeg&quality=88" \
   -o "/path/to/file.jpg"'
```

## Workflow для скріншотів

1. `mcp__pinchtab__pinchtab_list_tabs` — отримати tab IDs (cheap, без картинки)
2. curl для кожного скріну на dev сервері → зберегти у файл
3. scp файли на локальну машину → Read для перегляду

```bash
# Крок 2: скріншот
sshpass -p '805235io.' ssh vokov@192.168.3.184 \
  'curl -s -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
   "http://localhost:9867/screenshot?raw=true&tabId=TABID&format=jpeg&quality=88" \
   -o ~/workspace/ai-drakon-setup/import/sprint2_verify/screen.jpg'

# Крок 3: завантажити
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  vokov@192.168.3.184:~/workspace/ai-drakon-setup/import/sprint2_verify/screen.jpg \
  /tmp/screen.jpg
```

## HTTP API параметри

| Параметр | Опис |
|----------|------|
| `raw=true` | Повертає raw JPEG байти (не base64 JSON) |
| `tabId=<id>` | ID вкладки |
| `format=jpeg\|png` | Формат |
| `quality=0-100` | Якість (85-88 оптимально) |
| `selector=<css>` | Захопити конкретний елемент |

## Корисні MCP tools (cheap, без картинок)

```python
mcp__pinchtab__pinchtab_list_tabs()        # список вкладок
mcp__pinchtab__pinchtab_snapshot(compact=True, interactive=True, maxTokens=300)  # accessibility tree
mcp__pinchtab__pinchtab_click(selector="e12")   # клік по ref з snapshot
mcp__pinchtab__pinchtab_find(query="text")       # знайти елемент
mcp__pinchtab__pinchtab_navigate(url="...", tabId="...")  # навігація
mcp__pinchtab__pinchtab_eval(script="...", tabId="...")   # JS у браузері
```

## Відомі Tab IDs (можуть змінюватись!)

Tab IDs зберігаються між рестартами браузера але змінюються при закритті вкладки.
**Завжди** перевіряй через `list_tabs` перед використанням.

Поточні (2026-05-16, можуть бути застарілими):
- `166806789E43EDECFDCE9C81632B9147` — diagram editor

## React fiber injection для тестування done state

Якщо немає реальних схем, можна ін'єктувати fake result через консоль браузера:

```javascript
// Знайти CodeGenerationPanel fiber
const textareas = document.querySelectorAll('textarea');
for (const el of textareas) {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber'));
  if (!key) continue;
  let fiber = el[key];
  // Піднятись до компонента з useState
  while (fiber && fiber.memoizedState === null) fiber = fiber.return;
  if (!fiber) continue;
  // Знайти dispatcher для setStatus (state index 2) і setResult (index 4)
  const dispatchers = [];
  let state = fiber.memoizedState;
  while (state) { dispatchers.push(state.queue?.dispatch); state = state.next; }
  // dispatchers[2] = setStatus, dispatchers[4] = setResult, dispatchers[5] = setElapsed
  if (dispatchers[2]) dispatchers[2]('done');
  if (dispatchers[4]) dispatchers[4]({ code: "def hello():\n    return 'world'", syntax_errors: [], iterations: 2 });
  if (dispatchers[5]) dispatchers[5](3);
  break;
}
```
**ВАЖЛИВО:** result має бути об'єктом `{code, syntax_errors, iterations}`, не рядком!

## Якщо PinchTab не бачить панель на скріншоті

Панель може бути off-screen. Спробуй:
1. `pinchtab_scroll(direction="down", pixels=300)` — прокрутити сторінку
2. `pinchtab_eval(script="window.scrollTo(0, document.body.scrollHeight)")` — скрол вниз
3. Перевірити через `snapshot` що accessibility tree містить елементи панелі (textarea опис, кнопка Генерувати)
