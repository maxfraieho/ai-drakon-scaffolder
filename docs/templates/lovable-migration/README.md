# Lovable Account Migration — Template

Шаблон для переходу проекту на новий акаунт Lovable зі збереженням існуючого Cloudflare Pages.

## Архітектура

```
[Lovable UI] → writes → [drakon-diagram-flow] (repo B — frontend only)
                              ↓ GitHub Action (rsync src/ only)
                         [ai-drakon-setup] (repo A — full monorepo)
                              ↓ CF Pages build
                         [ai-drakon-setup.pages.dev]
```

**КРИТИЧНО:**
- Repo B (Lovable) містить **тільки фронтенд**. Lovable видалить все інше.
- Mirror: копіює тільки `src/`, `public/`, config — **не force push всього репо**.
- Весь бекенд (`services/`, `cloudflare-worker/`, `docs/`) живе тільки в repo A.

---

## Крок 1 — Підготувати Lovable repo (тільки фронтенд)

**НЕ робити `git push --force` всього монорепо в Lovable repo.**
Lovable видалить все що не є фронтендом і зламає структуру.

```bash
# Клонуємо Lovable repo окремо
git clone git@github.com:<owner>/<lovable-repo>.git /tmp/lovable-migration
cd /tmp/lovable-migration

# Копіюємо тільки фронтенд файли з основного репо
MAIN=/path/to/ai-drakon-setup

rsync -av --delete $MAIN/src/ ./src/
rsync -av $MAIN/public/ ./public/
cp $MAIN/package.json .
cp $MAIN/package-lock.json . 2>/dev/null || true
cp $MAIN/bun.lock . 2>/dev/null || true
cp $MAIN/tsconfig.json .
cp $MAIN/vite.config.ts .
cp $MAIN/components.json . 2>/dev/null || true
cp $MAIN/eslint.config.js . 2>/dev/null || true
cp $MAIN/.prettierrc . 2>/dev/null || true
cp $MAIN/.gitignore .

# ОБОВ'ЯЗКОВО: скопіювати src/ в .lovable/src/ — Lovable читає код звідти
mkdir -p .lovable/src
rsync -av --delete $MAIN/.lovable/src/ ./.lovable/src/
# Або якщо .lovable/src не існує:
rsync -av --delete $MAIN/src/ ./.lovable/src/

# Скопіювати workflow для mirror
mkdir -p .github/workflows
cp $MAIN/.github/workflows/mirror-to-ai-drakon.yml .github/workflows/

# Commit і push
git add .
git commit -m "feat: migrate frontend from ai-drakon-setup"
git push origin main --force
```

---

## Крок 2 — Mirror workflow (selective copy, не force push)

Файл `.github/workflows/mirror-to-ai-drakon.yml` в Lovable repo:

```yaml
name: Mirror frontend to ai-drakon-setup

on:
  push:
    branches: [main]

jobs:
  mirror:
    if: github.repository != 'maxfraieho/ai-drakon-setup'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Lovable repo (source)
        uses: actions/checkout@v4
        with:
          fetch-depth: 1
          persist-credentials: false

      - name: Checkout ai-drakon-setup (target)
        uses: actions/checkout@v4
        with:
          repository: maxfraieho/ai-drakon-setup
          token: ${{ secrets.MIRROR_TOKEN }}
          path: ai-drakon-setup
          fetch-depth: 1

      - name: Sync frontend files only (never touch backend)
        run: |
          rsync -av --delete src/ ai-drakon-setup/src/
          rsync -av --delete public/ ai-drakon-setup/public/ 2>/dev/null || true
          cp -f package.json ai-drakon-setup/package.json
          cp -f tsconfig.json ai-drakon-setup/tsconfig.json
          cp -f vite.config.ts ai-drakon-setup/vite.config.ts
          cp -f components.json ai-drakon-setup/components.json 2>/dev/null || true
          cp -f bun.lock ai-drakon-setup/bun.lock 2>/dev/null || true
          cp -f package-lock.json ai-drakon-setup/package-lock.json 2>/dev/null || true

      - name: Commit and push to ai-drakon-setup
        run: |
          cd ai-drakon-setup
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git config user.name "github-actions[bot]"
          git add src/ public/ package.json tsconfig.json vite.config.ts components.json bun.lock 2>/dev/null || true
          git diff --cached --quiet && echo "No frontend changes" && exit 0
          git commit -m "chore(mirror): sync frontend from drakon-diagram-flow @ ${{ github.sha }}"
          git push origin main
```

**Чому НЕ `git push --force`:**
- Force push замінює весь repo A — знищує `services/`, `cloudflare-worker/`, `docs/`
- `rsync` + selective copy оновлює тільки frontend файли, бекенд залишається незайманим

---

## Крок 3 — Встановити MIRROR_TOKEN secret

```bash
# Використати поточний gh токен
MIRROR_TOKEN=$(gh auth token)
gh secret set MIRROR_TOKEN --body "$MIRROR_TOKEN" --repo <owner>/<lovable-repo>

# Перевірити
gh secret list --repo <owner>/<lovable-repo>
```

---

## Крок 4 — Надати Lovable контекст (handoff)

Після push — в Lovable UI:
1. Підключити `<lovable-repo>` як GitHub repo
2. Вставити вміст `lovable-prompts/00-handoff.md` як перше повідомлення

**Важливо про промти:** Lovable не може читати файли з repo напряму через UI.
Треба вставляти вміст промту як текст. Посилання на файл (`lovable-prompts/45-...md`) 
спрацьовує тільки якщо Lovable конкретно підтримує file references в поточній версії.

---

## Крок 5 — Перевірити mirror

```bash
# Після першого Lovable commit перевірити GitHub Actions
gh run list --repo <owner>/<lovable-repo> --limit 3

# SHA в обох repo мають відрізнятись (різні commits) але src/ збігатись
gh api repos/<owner>/ai-drakon-setup/commits/main --jq '.commit.message'
gh api repos/<owner>/<lovable-repo>/commits/main --jq '.commit.message'
```

---

## Що НЕ треба робити (помилки)

| Дія | Чому небезпечно |
|-----|----------------|
| `git push --force` весь монорепо в Lovable repo | Lovable видалить бекенд при наступному commit |
| Mirror через `git push --force` repo A | Знищує весь бекенд в ai-drakon-setup |
| Зберігати config.json в git | Містить API ключі і токени |
| Force push main в ai-drakon-setup без backup | Незворотня втрата даних |
| Мержити Lovable commits напряму в main | Lovable може мати тільки фронтенд файли |

---

## Файли у цьому шаблоні

| Файл | Призначення |
|------|-------------|
| `lovable-prompts/00-handoff.md` | Контекст архітектури для Lovable (вставляти як текст) |
| `lovable-prompts/00-project-init.md` | Промт ініціалізації нового Lovable проекту |
