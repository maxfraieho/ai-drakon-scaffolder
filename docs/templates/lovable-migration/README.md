# Lovable Account Migration — Template

Шаблон для переходу проекту на новий акаунт Lovable зі збереженням існуючого Cloudflare Pages.

## Ситуація

- Є Lovable-проект підключений до GitHub repo **A** (`maxfraieho/ai-drakon-setup`)
- CF Pages будує з repo **A** → домен `ai-drakon-setup.pages.dev`
- Потрібно перейти на новий акаунт Lovable, який підключається до нового repo **B** (`maxfraieho/drakon-flow`)
- CF Pages **не можна перемкнути на новий repo через API** (обмеження Cloudflare)
- Мета: CF Pages продовжує будувати як раніше, Lovable пише в новий repo

## Рішення: GitHub Actions Mirror

Repo **B** (Lovable) → on push → GitHub Action → force push → Repo **A** (CF Pages source)

```
[Lovable] → push → [drakon-flow] → GitHub Action → [ai-drakon-setup] → CF Pages build
```

---

## Крок 1 — Push поточного коду в новий repo

```bash
# На сервері з існуючим repo (або локально)
cd ~/workspace/<project>/

# Додати новий remote
git remote add new-lovable git@github.com:<owner>/<new-repo>.git

# Force push (замінює вміст нового repo повністю)
git push new-lovable main --force
```

> **Увага:** `--force` потрібен, якщо Lovable вже зробив початковий коміт у новий repo.

---

## Крок 2 — Створити GitHub Actions workflow у новому repo

Файл `.github/workflows/mirror-to-cf-source.yml`:

```yaml
name: Mirror to CF Pages source repo

on:
  push:
    branches: [main]

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false   # КРИТИЧНО: вимикає GITHUB_TOKEN як credential

      - name: Push mirror to CF Pages source
        env:
          MIRROR_TOKEN: ${{ secrets.MIRROR_TOKEN }}
        run: |
          git remote add mirror "https://x-access-token:${MIRROR_TOKEN}@github.com/<owner>/<cf-source-repo>.git"
          git push mirror main --force
```

### Чому `persist-credentials: false`?

`actions/checkout@v4` автоматично встановлює `http.extraheader` з вбудованим `GITHUB_TOKEN`.  
Цей токен має доступ **тільки до поточного repo** і перекриває будь-які інші credentials для `github.com`.  
`persist-credentials: false` — прибирає цей override, дозволяючи використати `MIRROR_TOKEN`.

---

## Крок 3 — Встановити MIRROR_TOKEN secret

`MIRROR_TOKEN` — класичний GitHub PAT з `repo` scope, який має push-доступ до **обох** repo.

```bash
# На машині з gh CLI авторизованим під потрібним акаунтом
gh secret set MIRROR_TOKEN \
  --repo <owner>/<new-repo> \
  --body '<ghp_TOKEN>'

# Перевірити
gh secret list --repo <owner>/<new-repo>
```

### Як отримати токен

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → `repo` scope (повний доступ до приватних repo)
3. Зберегти як `MIRROR_TOKEN` secret у новому repo

> **Альтернатива:** якщо gh CLI вже авторизований:
> ```bash
> gh auth token  # скопіювати ghp_ токен
> ```
> Переконайтесь, що токен має `repo` scope: `curl -sI -H "Authorization: token <TOKEN>" https://api.github.com/user | grep x-oauth-scopes`

---

## Крок 4 — Commit та push workflow файлу

```bash
cd ~/workspace/<project>/
git add .github/workflows/mirror-to-cf-source.yml
git commit -m "ci: mirror <new-repo> → <cf-source-repo> on push to main"

# Push до обох repo
git push origin main          # CF Pages source (repo A)
git push new-lovable main --force   # Новий Lovable repo (repo B)
```

---

## Крок 5 — Перевірити що mirror працює

```bash
# Переглянути GitHub Actions runs
gh run list --repo <owner>/<new-repo> --limit 3

# Якщо failed — подивитись логи
gh run view <run-id> --log-failed --repo <owner>/<new-repo>
```

Очікуваний результат:
```
completed   success   Mirror to CF Pages source repo   main   push   ...
```

Перевірити що останній коміт у repo A збігається з repo B:
```bash
gh api repos/<owner>/<cf-source-repo>/commits/main --jq '.sha,.commit.message'
gh api repos/<owner>/<new-repo>/commits/main --jq '.sha,.commit.message'
# SHA мають збігатися
```

---

## Крок 6 — Налаштувати новий Lovable проект

1. Lovable → новий проект → Connect GitHub → обрати **<new-repo>**
2. Дати Lovable handoff контекст (файл `lovable-prompts/00-handoff.md`)
3. Lovable тепер пише в `<new-repo>` → Action автоматично дзеркалює в `<cf-source-repo>`
4. CF Pages будує як раніше — домен і env vars без змін

---

## Відомі обмеження

| Обмеження | Причина |
|-----------|---------|
| CF Pages API не підтримує зміну repo | PATCH `source.repo_name` ігнорується Cloudflare |
| Обидва repo мають бути доступні MIRROR_TOKEN | Fine-grained PAT не підходить якщо обидва repo різних акаунтів |
| Force push кожен раз | Lovable може додавати коміти між нашими — force завжди актуалізує |
| Workflow файл у новому repo | Після першого push Lovable не чіпатиме workflow файли |

---

## Файли у цьому проекті

| Файл | Призначення |
|------|-------------|
| `.github/workflows/mirror-to-ai-drakon.yml` | Actual workflow для drakon-flow → ai-drakon-setup |
| `lovable-prompts/00-project-init.md` | Промт для ініціалізації нового Lovable проекту |
| `lovable-prompts/00-handoff.md` | Handoff контекст для Lovable після push коду |
